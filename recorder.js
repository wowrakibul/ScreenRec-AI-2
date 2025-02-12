class SupabaseScreenRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.startTime = null;
        this.timerInterval = null;
        this.stream = null;
        
        // Initialize Supabase client
        this.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        
        // DOM elements
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.preview = document.getElementById('preview');
        this.status = document.getElementById('status');
        this.recordingTime = document.getElementById('recordingTime');
        this.progressBar = document.getElementById('progressBar');
        this.progressBarFill = document.getElementById('progressBarFill');
        
        // Bind events
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always",
                    frameRate: { ideal: 30 }
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
            this.status.textContent = 'Recording in progress...';
            this.status.classList.add('recording');
        } catch (error) {
            console.error('Error starting recording:', error);
            this.status.textContent = 'Error: ' + error.message;
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
            const url = await this.uploadToSupabase(blob);
            this.status.textContent = 'Recording uploaded successfully!';
            this.status.innerHTML += `<br><a href="${url}" target="_blank">View Recording</a>`;
        } catch (error) {
            console.error('Error uploading to Supabase:', error);
            this.status.textContent = 'Error: ' + error.message;
        }

        this.recordedChunks = [];
        this.progressBar.style.display = 'none';
    }

    updateTimer() {
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        this.recordingTime.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    async uploadToSupabase(blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = `recordings/${CONFIG.USERNAME}/${CONFIG.CURRENT_DATE}/recording-${timestamp}.webm`;
        
        this.progressBar.style.display = 'block';
        this.progressBarFill.style.width = '0%';

        try {
            // Upload the file
            const { data, error } = await this.supabase.storage
                .from(CONFIG.BUCKET_NAME)
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false,
                    onUploadProgress: (progress) => {
                        const percentage = (progress.loaded / progress.total) * 100;
                        this.progressBarFill.style.width = `${percentage}%`;
                    }
                });

            if (error) throw error;

            // Get the public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from(CONFIG.BUCKET_NAME)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Supabase upload error:', error);
            throw new Error('Failed to upload recording to Supabase');
        }
    }
}

// Initialize the recorder
const recorder = new SupabaseScreenRecorder();
