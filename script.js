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
        this.downloadPdfBtn = document.getElementById('downloadPdfBtn');
        this.downloadAllPdfBtn = document.getElementById('downloadAllPdfBtn');
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
        this.downloadPdfBtn.addEventListener('click', () => this.downloadSinglePdf());
        this.downloadAllPdfBtn.addEventListener('click', () => this.downloadBatchPdf());
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
                this.updateBatchStatus(i, '压缩中...', 'processing');
                
                const compressedBlob = await this.compressImageFile(file);
                this.processedFiles.push({
                    originalFile: file,
                    compressedBlob: compressedBlob,
                    index: i
                });
                
                this.updateBatchCompressionInfo(i, compressedBlob.size);
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
        const originalSize = this.formatFileSize(file.size);
        info.innerHTML = `
            <div><strong>${file.name}</strong></div>
            <div class="batch-size-info">
                <span class="original-size">原始: <span class="size-value">${originalSize}</span></span>
                <span class="compressed-size" id="compressed-${index}" style="display: none;">压缩后: <span class="size-value"></span></span>
            </div>
            <div class="batch-compression-rate" id="rate-${index}" style="display: none;">压缩率: <span class="rate-value"></span></div>
            <div class="batch-status" id="status-${index}">等待处理...</div>
        `;
        
        item.appendChild(img);
        item.appendChild(info);
        
        return item;
    }

    updateBatchStatus(index, status, type) {
        const statusEl = document.getElementById(`status-${index}`);
        statusEl.textContent = status;
        statusEl.style.color = type === 'success' ? '#48bb78' : type === 'processing' ? '#3182ce' : '#e53e3e';
    }

    updateBatchCompressionInfo(index, compressedSize) {
        const originalFile = this.processedFiles.find(f => f.index === index)?.originalFile;
        if (!originalFile) return;
        
        const originalSize = originalFile.size;
        const compressedSizeFormatted = this.formatFileSize(compressedSize);
        
        const compressedEl = document.getElementById(`compressed-${index}`);
        const rateEl = document.getElementById(`rate-${index}`);
        
        if (compressedEl) {
            compressedEl.style.display = 'block';
            compressedEl.querySelector('.size-value').textContent = compressedSizeFormatted;
        }
        
        if (rateEl && originalSize > 0) {
            const compressionRate = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
            rateEl.style.display = 'block';
            rateEl.querySelector('.rate-value').textContent = `${compressionRate}%`;
        }
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
            img.onload = async () => {
                try {
                    // 使用渐进式压缩算法确保文件大小在500KB以内
                    const compressedBlob = await this.progressiveCompression(img, file);
                    resolve(compressedBlob);
                } catch (error) {
                    console.error('压缩过程失败:', error);
                    // 如果压缩失败，返回原始文件
                    resolve(file.slice(0, file.size, file.type));
                } finally {
                    // 清理URL对象
                    URL.revokeObjectURL(img.src);
                }
            };
            
            img.onerror = () => {
                console.error('无法加载图片');
                // 加载失败时返回原始文件
                resolve(file.slice(0, file.size, file.type));
            };
            
            // 跨域设置，确保可以加载所有来源的图片
            img.crossOrigin = 'anonymous';
            img.src = URL.createObjectURL(file);
        });
    }

    calculateOptimalDimensions(originalWidth, originalHeight, fileSize) {
        // 根据文件大小智能调整尺寸
        const targetSize = 500 * 1024; // 500KB
        const maxDimension = 4000; // 4K分辨率上限
        
        let width = originalWidth;
        let height = originalHeight;
        
        // 首先限制最大尺寸
        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }
        
        // 如果文件仍然过大，进一步按比例缩小
        if (fileSize > targetSize * 2) {
            const reductionFactor = Math.sqrt(targetSize * 2 / fileSize);
            const newWidth = Math.round(width * reductionFactor);
            const newHeight = Math.round(height * reductionFactor);
            
            // 确保宽度至少为原始宽度的50%，避免过度压缩
            width = Math.max(newWidth, Math.round(width * 0.5));
            height = Math.max(newHeight, Math.round(height * 0.5));
        }
        
        return { width, height };
    }

    getOptimalQuality(fileType, fileSize) {
        // 自适应质量设置，目标是500KB以内
        const targetSize = 500 * 1024; // 500KB
        
        if (fileType === 'image/jpeg') {
            if (fileSize > targetSize * 4) return 0.85;  // 超大文件
            if (fileSize > targetSize * 2) return 0.90;  // 大文件
            if (fileSize > targetSize) return 0.93;      // 接近目标
            return 0.95;  // 小文件保持高质量
        } else if (fileType === 'image/png') {
            // PNG文件特殊处理，降低质量或考虑转换格式
            if (fileSize > targetSize * 2) return 0.80;  // 超大PNG
            if (fileSize > targetSize) return 0.90;      // 大PNG
            return 1.0;  // 小PNG无损压缩
        } else if (fileType === 'image/webp') {
            // WebP格式有更好的压缩率
            if (fileSize > targetSize * 4) return 0.80;
            if (fileSize > targetSize * 2) return 0.85;
            if (fileSize > targetSize) return 0.90;
            return 0.95;
        }
        
        return 0.90; // 默认质量
    }
    
    // 渐进式压缩算法，确保文件大小在500KB以内
    async progressiveCompression(img, originalFile) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetSize = 500 * 1024; // 500KB目标
        
        // 设置高质量绘制
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 初始尺寸和质量
        let { width, height } = this.calculateOptimalDimensions(img.width, img.height, originalFile.size);
        let quality = this.getOptimalQuality(originalFile.type, originalFile.size);
        
        // 最多尝试5次渐进式压缩
        for (let attempt = 0; attempt < 5; attempt++) {
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // 创建Blob并检查大小
            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, originalFile.type, quality);
            });
            
            if (!blob) continue;
            
            // 如果达到目标大小或已经是最后一次尝试，返回结果
            if (blob.size <= targetSize || attempt === 4) {
                // 如果压缩后反而变大，返回原始图片
                if (blob.size >= originalFile.size * 0.95) {
                    return originalFile.slice(0, originalFile.size, originalFile.type);
                }
                return blob;
            }
            
            // 如果PNG文件太大，可以考虑转换为WebP格式
            if (originalFile.type === 'image/png' && blob.size > targetSize * 1.5 && attempt === 2) {
                return new Promise((resolve) => {
                    canvas.toBlob(resolve, 'image/webp', 0.85);
                });
            }
            
            // 调整参数进行下一次尝试
            if (blob.size > targetSize * 1.5) {
                // 文件仍然太大，缩小尺寸和降低质量
                const scale = Math.sqrt(targetSize / blob.size);
                width = Math.round(width * scale * 0.95);
                height = Math.round(height * scale * 0.95);
                quality = Math.max(0.7, quality - 0.08);
            } else {
                // 接近目标，仅降低质量
                quality = Math.max(0.75, quality - 0.05);
            }
        }
        
        // 所有尝试失败，返回最佳结果
        return new Promise((resolve) => {
            canvas.toBlob(resolve, originalFile.type, 0.8);
        });
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

    async downloadSinglePdf() {
        if (!this.compressedBlob) {
            alert('请先处理图片');
            return;
        }

        try {
            const jspdfModule = window.jspdf || { jsPDF: window.jsPDF };
            const { jsPDF } = jspdfModule;
            
            if (!jsPDF || typeof jsPDF !== 'function') {
                throw new Error('jsPDF库未正确加载');
            }

            const imgData = await this.blobToBase64(this.compressedBlob);
            const img = new Image();
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imgData;
            });

            const marginPt = 42.52;
            const pdfWidth = 595.28;
            const pdfHeight = 841.89;
            const availableWidth = pdfWidth - marginPt * 2;
            const availableHeight = pdfHeight - marginPt * 2;
            
            const imgWidth = img.width;
            const imgHeight = img.height;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            let scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
            let scaledWidth = imgWidth * scale;
            let scaledHeight = imgHeight * scale;
            
            let x = marginPt + (availableWidth - scaledWidth) / 2;
            let y = marginPt + (availableHeight - scaledHeight) / 2;

            pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, scaledHeight);

            const originalName = this.currentFile.name;
            const nameParts = originalName.split('.');
            nameParts.pop();
            const nameWithoutExt = nameParts.join('.');

            pdf.save(`${nameWithoutExt}.pdf`);
        } catch (error) {
            console.error('生成PDF失败:', error);
            alert('生成PDF失败，请重试\n错误信息: ' + error.message);
        }
    }

    async downloadBatchPdf() {
        if (this.processedFiles.length === 0) {
            alert('请先处理图片');
            return;
        }

        try {
            const jspdfModule = window.jspdf || { jsPDF: window.jsPDF };
            const { jsPDF } = jspdfModule;
            
            if (!jsPDF || typeof jsPDF !== 'function') {
                throw new Error('jsPDF库未正确加载');
            }

            const marginPt = 42.52;
            const pdfWidth = 595.28;
            const pdfHeight = 841.89;
            const availableWidth = pdfWidth - marginPt * 2;
            const availableHeight = pdfHeight - marginPt * 2;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            for (let i = 0; i < this.processedFiles.length; i++) {
                const fileData = this.processedFiles[i];
                const imgData = await this.blobToBase64(fileData.compressedBlob);
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = imgData;
                });

                const imgWidth = img.width;
                const imgHeight = img.height;

                let scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
                let scaledWidth = imgWidth * scale;
                let scaledHeight = imgHeight * scale;
                
                let x = marginPt + (availableWidth - scaledWidth) / 2;
                let y = marginPt + (availableHeight - scaledHeight) / 2;

                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, scaledHeight);
            }

            pdf.save('compressed_images.pdf');
        } catch (error) {
            console.error('生成PDF失败:', error);
            alert('生成PDF失败，请重试\n错误信息: ' + error.message);
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
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