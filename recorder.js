class GitHubScreenRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.startTime = null;
        this.timerInterval = null;
        this.stream = null;
        
        // DOM elements
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.preview = document.getElementById('preview');
        this.status = document.getElementById('status');
        this.recordingTime = document.getElementById('recordingTime');
        
        // Bind events
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always"
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            this.preview.srcObject = this.stream;

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => this.handleRecordingStopped();

            this.mediaRecorder.start(1000);
            this.startTime = Date.now();
            this.updateTimer();
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);

            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.status.textContent = 'Recording...';
            this.status.classList.add('recording');
        } catch (error) {
            console.error('Error starting recording:', error);
            this.status.textContent = 'Error starting recording: ' + error.message;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    async handleRecordingStopped() {
        clearInterval(this.timerInterval);
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.status.classList.remove('recording');
        this.status.textContent = 'Processing recording...';

        const blob = new Blob(this.recordedChunks, {
            type: 'video/webm'
        });

        try {
            await this.uploadToGitHub(blob);
            this.status.textContent = 'Recording uploaded successfully!';
        } catch (error) {
            console.error('Error uploading to GitHub:', error);
            this.status.textContent = 'Error uploading recording: ' + error.message;
        }

        this.recordedChunks = [];
    }

    updateTimer() {
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        this.recordingTime.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    async uploadToGitHub(blob) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        
        return new Promise((resolve, reject) => {
            reader.onloadend = async () => {
                try {
                    const base64Data = reader.result.split(',')[1];
                    const username = 'wowrakibul'; // Using the provided username
                    const date = new Date().toISOString().split('T')[0];
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const fileName = `recordings/${username}/${date}/recording-${timestamp}.webm`;

                    const response = await axios.put(
                        `https://api.github.com/repos/${CONFIG.GITHUB_REPO}/contents/${fileName}`,
                        {
                            message: `Add screen recording ${timestamp}`,
                            content: base64Data,
                            branch: CONFIG.GITHUB_BRANCH
                        },
                        {
                            headers: {
                                'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
                                'Content-Type': 'application/json',
                            }
                        }
                    );

                    resolve(response.data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
        });
    }
}

// Initialize the recorder
const recorder = new GitHubScreenRecorder();