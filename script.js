document.addEventListener('DOMContentLoaded', function() {
    // 元素引用
    const apiKeyInput = document.getElementById('apiKey');
    const baseUrlInput = document.getElementById('baseUrl');
    const transcriptionModelInput = document.getElementById('transcriptionModel');
    const summarizationModelInput = document.getElementById('summarizationModel');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const dropArea = document.getElementById('dropArea');
    const audioFileInput = document.getElementById('audioFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const processBtn = document.getElementById('processBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const resultsCard = document.getElementById('resultsCard');
    const summaryContent = document.getElementById('summaryContent');
    const transcriptContent = document.getElementById('transcriptContent');
    const copySummaryBtn = document.getElementById('copySummaryBtn');
    const copyTranscriptBtn = document.getElementById('copyTranscriptBtn');
    
    // 加载保存的设置
    loadSavedSettings();
    
    // API密钥显示切换
    toggleApiKeyBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleApiKeyBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            apiKeyInput.type = 'password';
            toggleApiKeyBtn.innerHTML = '<i class="bi bi-eye"></i>';
        }
    });
    
    // 保存设置
    [apiKeyInput, baseUrlInput, transcriptionModelInput, summarizationModelInput].forEach(input => {
        input.addEventListener('input', saveSettings);
        input.addEventListener('change', saveSettings);
    });
    
    // 拖放事件处理
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('dragover');
        }, false);
    });
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            audioFileInput.files = files;
            updateFileInfo();
        }
    }
    
    // 上传按钮点击
    uploadBtn.addEventListener('click', () => {
        audioFileInput.click();
    });
    
    // 移除文件按钮点击
    removeFileBtn.addEventListener('click', () => {
        audioFileInput.value = '';
        fileInfo.classList.add('d-none');
        checkProcessBtnState();
    });
    
    // 文件选择改变
    audioFileInput.addEventListener('change', updateFileInfo);
    
    function updateFileInfo() {
        if (audioFileInput.files.length > 0) {
            const file = audioFileInput.files[0];
            fileName.textContent = file.name;
            fileInfo.classList.remove('d-none');
            checkProcessBtnState();
        }
    }
    
    // 复制按钮功能
    copySummaryBtn.addEventListener('click', () => {
        copyToClipboard(summaryContent.innerText, copySummaryBtn);
    });
    
    copyTranscriptBtn.addEventListener('click', () => {
        copyToClipboard(transcriptContent.innerText, copyTranscriptBtn);
    });
    
    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="bi bi-check-lg me-1"></i>已复制';
            button.classList.add('copy-animation');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copy-animation');
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
    }
    
    // 检查处理按钮状态
    function checkProcessBtnState() {
        processBtn.disabled = !(apiKeyInput.value && audioFileInput.files.length > 0);
    }
    
    // 保存设置到localStorage
    function saveSettings() {
        localStorage.setItem('audioSummarizer_apiKey', apiKeyInput.value);
        localStorage.setItem('audioSummarizer_baseUrl', baseUrlInput.value);
        localStorage.setItem('audioSummarizer_transcriptionModel', transcriptionModelInput.value);
        localStorage.setItem('audioSummarizer_summarizationModel', summarizationModelInput.value);
        checkProcessBtnState();
    }
    
    // 加载保存的设置
    function loadSavedSettings() {
        apiKeyInput.value = localStorage.getItem('audioSummarizer_apiKey') || '';
        baseUrlInput.value = localStorage.getItem('audioSummarizer_baseUrl') || 'https://api.openai.com';
        transcriptionModelInput.value = localStorage.getItem('audioSummarizer_transcriptionModel') || 'whisper-1';
        summarizationModelInput.value = localStorage.getItem('audioSummarizer_summarizationModel') || 'gpt-3.5-turbo';
        checkProcessBtnState();
    }
    
    // 处理按钮点击
    processBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const baseUrl = baseUrlInput.value.trim();
        const transcriptionModel = transcriptionModelInput.value.trim();
        const summarizationModel = summarizationModelInput.value.trim();
        
        if (!apiKey) {
            alert('请输入API密钥');
            return;
        }
        
        if (!baseUrl) {
            alert('请输入有效的API基础URL');
            return;
        }
        
        if (!audioFileInput.files.length) {
            alert('请选择音频文件');
            return;
        }
        
        const audioFile = audioFileInput.files[0];
        
        // 显示进度条并禁用按钮
        progressContainer.classList.remove('d-none');
        processBtn.disabled = true;
        resultsCard.classList.add('d-none');
        
        try {
            // 第一步：转录音频
            updateProgress(30, '正在转录音频...');
            const transcript = await transcribeAudio(apiKey, baseUrl, transcriptionModel, audioFile);
            
            // 第二步：总结内容
            updateProgress(70, '正在生成总结...');
            const summary = await summarizeContent(apiKey, baseUrl, summarizationModel, transcript);
            
            // 显示结果
            updateProgress(100, '处理完成!');
            displayResults(transcript, summary);
        } catch (error) {
            alert('处理过程中出错: ' + error.message);
            console.error('Error:', error);
            progressContainer.classList.add('d-none');
            processBtn.disabled = false;
        }
    });
    
    // 更新进度条
    function updateProgress(percent, message) {
        progressBar.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', percent);
        progressBar.textContent = message;
    }
    
    // 转录音频函数
    async function transcribeAudio(apiKey, baseUrl, model, audioFile) {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('model', model);
        formData.append('response_format', 'text');
        
        const response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`转录失败: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
        
        return await response.text();
    }
    
    // 总结内容函数
    async function summarizeContent(apiKey, baseUrl, model, transcript) {
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { 
                        role: 'system', 
                        content: '请将以下音频转录内容进行总结，提取关键点和主要内容。使用中文回答，并以清晰的结构展示。' 
                    },
                    { role: 'user', content: transcript }
                ],
                max_tokens: 800
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`总结失败: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    // 显示结果
    function displayResults(transcript, summary) {
        // 处理和显示总结内容
        const formattedSummary = summary.replace(/\n/g, '<br>');
        summaryContent.innerHTML = formattedSummary;
        
        // 处理和显示转录内容
        const formattedTranscript = transcript.replace(/\n/g, '<br>');
        transcriptContent.innerHTML = formattedTranscript;
        
        // 显示结果卡片
        resultsCard.classList.remove('d-none');
        resultsCard.classList.add('fadeIn');
        
        // 滚动到结果
        resultsCard.scrollIntoView({ behavior: 'smooth' });
        
        // 重置进度条
        setTimeout(() => {
            progressContainer.classList.add('d-none');
            processBtn.disabled = false;
        }, 1000);
    }
});
