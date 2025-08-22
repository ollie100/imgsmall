class ImageCompressor {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.batchFiles = [];
        this.processedFiles = [];
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.options = document.getElementById('options');
        this.preview = document.getElementById('preview');
        this.batchProcessing = document.getElementById('batchProcessing');
        
        this.originalImage = document.getElementById('originalImage');
        this.compressedImage = document.getElementById('compressedImage');
        this.originalSize = document.getElementById('originalSize');
        this.compressedSize = document.getElementById('compressedSize');
        this.compressionRatio = document.getElementById('compressionRatio');
        
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.batchList = document.getElementById('batchList');
    }

    bindEvents() {
        // 文件选择
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // 拖拽上传
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // 下载按钮
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllImages());
    }

    handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/') && 
            ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
        );
        
        if (imageFiles.length === 0) {
            alert('请选择有效的图片文件 (JPG, PNG, WebP)');
            return;
        }

        if (imageFiles.length === 1) {
            // 单个文件处理
            this.processSingleFile(imageFiles[0]);
        } else {
            // 批量处理
            this.processBatchFiles(imageFiles);
        }
    }

    async processSingleFile(file) {
        this.currentFile = file;
        this.options.style.display = 'block';
        this.preview.style.display = 'block';
        this.batchProcessing.style.display = 'none';
        
        // 显示原图
        const originalUrl = URL.createObjectURL(file);
        this.originalImage.src = originalUrl;
        this.originalSize.textContent = `大小: ${this.formatFileSize(file.size)}`;
        
        await this.compressImage(file);
        
        // 压缩完成后隐藏处理提示
        setTimeout(() => {
            this.options.style.display = 'none';
        }, 1000);
    }

    async processBatchFiles(files) {
        this.batchFiles = files;
        this.processedFiles = [];
        this.options.style.display = 'none';
        this.preview.style.display = 'none';
        this.batchProcessing.style.display = 'block';
        
        this.batchList.innerHTML = '';
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const batchItem = this.createBatchItem(file, i);
            this.batchList.appendChild(batchItem);
            
            try {
                const compressedBlob = await this.compressImageFile(file);
                this.processedFiles.push({
                    originalFile: file,
                    compressedBlob: compressedBlob,
                    index: i
                });
                
                this.updateBatchStatus(i, '完成', 'success');
            } catch (error) {
                this.updateBatchStatus(i, '失败', 'error');
                console.error('压缩失败:', error);
            }
        }
    }

    createBatchItem(file, index) {
        const item = document.createElement('div');
        item.className = 'batch-item';
        item.id = `batch-item-${index}`;
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        
        const info = document.createElement('div');
        info.className = 'batch-info';
        info.innerHTML = `
            <div><strong>${file.name}</strong></div>
            <div class="batch-status" id="status-${index}">等待处理...</div>
        `;
        
        item.appendChild(img);
        item.appendChild(info);
        
        return item;
    }

    updateBatchStatus(index, status, type) {
        const statusEl = document.getElementById(`status-${index}`);
        statusEl.textContent = status;
        statusEl.style.color = type === 'success' ? '#48bb78' : '#e53e3e';
    }

    async compressImage(file) {
        try {
            const compressedBlob = await this.compressImageFile(file);
            const compressedUrl = URL.createObjectURL(compressedBlob);
            
            this.compressedImage.src = compressedUrl;
            this.compressedSize.textContent = `大小: ${this.formatFileSize(compressedBlob.size)}`;
            
            const ratio = ((file.size - compressedBlob.size) / file.size * 100).toFixed(1);
            this.compressionRatio.textContent = `压缩率: ${ratio}%`;
            
            this.compressedBlob = compressedBlob;
        } catch (error) {
            console.error('压缩失败:', error);
            alert('图片压缩失败，请重试');
        }
    }

    async compressImageFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 智能尺寸调整：只在图片非常大时缩小
                    let { width, height } = this.calculateOptimalDimensions(img.width, img.height);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 高质量绘制设置
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // 绘制图片
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 使用最高质量设置转换为blob
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('无法创建压缩图片'));
                            }
                        },
                        file.type,
                        this.getOptimalQuality(file.type, file.size)
                    );
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('无法加载图片'));
            img.src = URL.createObjectURL(file);
        });
    }

    calculateOptimalDimensions(originalWidth, originalHeight) {
        // 智能尺寸调整：只在图片非常大时进行适当缩小
        const maxDimension = 4000; // 4K分辨率
        
        let width = originalWidth;
        let height = originalHeight;
        
        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }
        
        return { width, height };
    }

    getOptimalQuality(fileType, fileSize) {
        // 根据文件类型和大小智能选择质量
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (fileType === 'image/jpeg') {
            // JPEG: 高质量压缩
            return fileSize > maxSize ? 0.95 : 0.98;
        } else if (fileType === 'image/png') {
            // PNG: 无损压缩
            return 1.0;
        } else if (fileType === 'image/webp') {
            // WebP: 高质量压缩
            return fileSize > maxSize ? 0.95 : 0.98;
        }
        
        return 0.95; // 默认高质量
    }

    downloadImage() {
        if (!this.compressedBlob) return;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.compressedBlob);
        
        const originalName = this.currentFile.name;
        const nameParts = originalName.split('.');
        const extension = nameParts.pop();
        const nameWithoutExt = nameParts.join('.');
        
        link.download = `${nameWithoutExt}_compressed.${extension}`;
        link.click();
    }

    async downloadAllImages() {
        if (this.processedFiles.length === 0) return;
        
        for (const fileData of this.processedFiles) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(fileData.compressedBlob);
            
            const originalName = fileData.originalFile.name;
            const nameParts = originalName.split('.');
            const extension = nameParts.pop();
            const nameWithoutExt = nameParts.join('.');
            
            link.download = `${nameWithoutExt}_compressed.${extension}`;
            link.click();
            
            // 小延迟避免浏览器阻止多个下载
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageCompressor();
});

// 添加一些实用功能
window.addEventListener('beforeunload', (e) => {
    // 清理所有创建的URL对象
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    });
});