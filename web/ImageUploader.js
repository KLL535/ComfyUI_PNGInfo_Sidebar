import { app } from "../../../scripts/app.js";
// import * as pngMetadata from "../../../scripts/metadata/png.js"; // ЗАКОММЕНТИРОВАНО: Внутренний API заблокирован
import ComfyUI from "./read_prompt_comfy.js";
import ForgeUI from "./read_prompt_forge.js";

export class ImageUploader {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.options = { ...options };
        this.currentObjectURL = null;
        this.log('ImageUploader constructor');
    }

    init() {
        this.log('ImageUploader init');
        this.createElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    log(...args) {
        if (this.options.isDebugMode) {
            console.log(...args);
        }
    }

    showToast(severity, summary, detail) {
        if (app.extensionManager?.toast) {
            app.extensionManager.toast.add({
                severity: severity,
                summary: summary,
                detail: detail,
                life: 3000
            });
        } else {
            console.warn(summary, detail);
        }
    }

    createElements() {
        this.log('ImageUploader createElements');
        this.innerContainer = document.createElement('div');
        this.innerContainer.className = 'image-uploader-container';

        this.button = document.createElement('button');
        this.button.className = 'image-uploader-button';
        this.button.textContent = '+';
        this.button.title = 'Click to load new image or drop new image';

        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.hidden = true;

        this.dropOverlay = document.createElement('div');
        this.dropOverlay.className = 'drop-overlay';

        this.innerContainer.appendChild(this.button);
        this.innerContainer.appendChild(this.fileInput);
        this.innerContainer.appendChild(this.dropOverlay);
        this.container.appendChild(this.innerContainer);
    }

    setupEventListeners() {
        this.log('ImageUploader setupEventListeners');
        this.button.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    setupDragAndDrop() {
        this.log('ImageUploader setupDragAndDrop');
        const preventDefault = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        this.innerContainer.addEventListener('dragover', (e) => {
            preventDefault(e);
            this.dropOverlay.classList.add('active');
        });

        this.innerContainer.addEventListener('dragleave', (e) => {
            preventDefault(e);
            this.dropOverlay.classList.remove('active');
        });

        this.innerContainer.addEventListener('drop', (e) => {
            preventDefault(e);
            this.dropOverlay.classList.remove('active');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect({ target: { files } });
            }
        });
    }

    handleFileSelect(e) {
        this.log('ImageUploader handleFileSelect');
        const file = e.target.files[0];
        if (!file) return;

        const allowedExtensions = ['image/png', 'image/jpeg'];
        const isImage = allowedExtensions.includes(file.type);

        this.fileInput.value = '';

        if (isImage) {
            this.clearPreviousImage();
            this.displayImage(file);
            this.addImageClickHandler();
        } else {
            this.showToast('error', 'PNGInfo Failed', `Unsupported file format`);
        }
    }

    async displayImage(file) {
        this.log('ImageUploader displayImage');
        try {
            this.currentObjectURL = URL.createObjectURL(file);
            
            const img = document.createElement('img');
            img.className = 'image-uploader-preview';
            img.src = this.currentObjectURL;
            img.title = 'Click to load new image or drop new image';

            const metadata = await this.readMetadata(file);
            const metadataContainer = this.createMetadataContainer(metadata);

            this.innerContainer.replaceChildren(
                img, 
                metadataContainer,
                this.fileInput,
                this.dropOverlay
            );
            
            this.addImageClickHandler();
            
        } catch (error) {
            const error_text = `Error in displayImage`;
            console.error(`${error_text}: `, error);
            this.showToast('error', 'PNGInfo Failed', `${error_text}`);
        }
    }

    async readMetadata(file) {
        this.log('ImageUploader readMetadata');
        const baseMetadata = {};

        try {
            if (file.type === 'image/png') {
                const pngData = await this.readPNGMetadata(file);
                return { ...baseMetadata, ...pngData };
            }

            if (file.type === 'image/jpeg') {
                const exifData = await this.readEXIFMetadata(file);
                return { ...baseMetadata, ...exifData };
            }
            
        } catch (error) {
            const error_text = `Error in readMetadata`;
            console.error(`${error_text}: `, error);
            this.showToast('error', 'PNGInfo Failed', `${error_text}`);
        }

        return baseMetadata;
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsArrayBuffer(file);
        });
    }

    // --- НОВЫЙ ПАРСЕР PNG (Вместо заблокированного модуля) ---
    async readPNGMetadata(file) {
        this.log('ImageUploader readPNGMetadata');
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const data = new Uint8Array(arrayBuffer);
            
            // Простой парсер PNG чанков для поиска tEXt
            const metadata = this.parsePngChunks(data);
            return this.parceMetadata(metadata);
        } catch (error) {
            console.error('Error reading meta', error);
            throw error; 
        }
    }

    parsePngChunks(data) {
        // Проверка сигнатуры PNG
        if (data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71) {
            console.warn("Not a valid PNG file");
            return {};
        }

        let offset = 8; // Пропускаем сигнатуру
        const textData = {};

        while (offset < data.length) {
            // Длина чанка (4 байта, big-endian)
            const length = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
            // Тип чанка (4 байта)
            const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
            
            // Данные чанка
            const chunkData = data.slice(offset + 8, offset + 8 + length);
            
            // Обрабатываем текстовые чанки: tEXt, zTXt, iTXt
            if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
                // Находим разделитель нулевым байтом
                let nullIndex = -1;
                for (let i = 0; i < chunkData.length; i++) {
                    if (chunkData[i] === 0) {
                        nullIndex = i;
                        break;
                    }
                }
                
                if (nullIndex > 0) {
                    const rawKey = String.fromCharCode(...chunkData.slice(0, nullIndex));
                    const key = rawKey.trim().toLowerCase();
                    
                    let value = '';
                    if (type === 'tEXt') {
                        const decoder = typeof TextDecoder !== 'undefined' 
                            ? new TextDecoder('utf-8') 
                            : { decode: (arr) => new TextDecoder('utf-8').decode(arr) };
                        value = decoder.decode(chunkData.slice(nullIndex + 1));
                    } else {
                        // Для zTXt/iTXt — пока без распаковки
                        const decoder = typeof TextDecoder !== 'undefined' 
                            ? new TextDecoder('utf-8') 
                            : { decode: (arr) => Array.from(arr).map(b => String.fromCharCode(b)).join('') };
                        value = decoder.decode(chunkData.slice(nullIndex + 1));
                        this.log(`Warning: ${type} chunk not fully decompressed: ${key}`);
                    }
                    
                    // Отладка: логируем ВСЕ найденные ключи
                    this.log(`Found PNG chunk key: "${rawKey}" -> normalized: "${key}"`);
                    
                    if (key === 'parameters' || key === 'prompt' || key === 'workflow') {
                        // Сохраняем под оригинальным именем ключа (как ожидает parceMetadata)
                        const storeKey = key === 'parameters' ? 'parameters' : key;
                        textData[storeKey] = value;
                        this.log(`Stored ${storeKey}: ${value.substring(0, 100)}...`);
                    }
                }
            }
            
            offset += 12 + length;
            
            // Если нашли IEND, конец файла
            if (type === 'IEND') break;
        }

        this.log(`parsePngChunks result keys: ${Object.keys(textData).join(', ')}`);
        return textData;
    }
    // ---------------------------------------------------------

    parceMetadata(metadata) {   
        this.log('ImageUploader parceMetadata'); 
        this.log(metadata);

        let result = {};

        // Проверка на пустоту metadata
        if (!metadata || Object.keys(metadata).length === 0) {
             result["Error"] = "No metadata found in image";
             return result;
        }

        try { 
            if (metadata && metadata.parameters) {
                const forge_parcer = new ForgeUI(metadata.parameters, {
                    isDebugMode: this.options.isDebugMode,
                    colors: this.options.colors
                });
                forge_parcer.run();
                result = forge_parcer.output;
                if (Object.keys(result).length > 0) return result;
            }
        } catch (error) {
            const error_text = "Error in parameters section ";
            console.error(error_text, error);
            // Не возвращаем сразу, пробуем другой вариант
        }

        try { 
            if (metadata && metadata.prompt) {
                const comfy_parcer = new ComfyUI(metadata.prompt, {
                    isDebugMode: this.options.isDebugMode,
                    colors: this.options.colors
                });
                comfy_parcer.run();
                result = comfy_parcer.output;
                if (Object.keys(result).length > 0) return result;
            }
        } catch (error) {
            const error_text = "Error in prompt section ";
            console.error(error_text, error);
        }

        if (Object.keys(result).length === 0) {
            result["Error"] = "None (Metadata exists but format unrecognized)";
            // Для отладки покажем сырые данные, если есть
            if(metadata.workflow) {
                result["Raw Workflow"] = "Exists (ComfyUI Native)";
            }
        }

        return result;
    }

    createMetadataContainer(metadata) {
        this.log('ImageUploader createMetadataContainer'); 

        const container = document.createElement('div');
        container.className = 'image-metadata';

        const metadataHTML = Object.entries(metadata || {}).flatMap(([header, value]) => {
            const safeValue = value ?? '';
            if (Array.isArray(safeValue)) {
                return safeValue.map(item => 
                    `${this.options.colors.color_header}${header}${this.options.colors.color_default}${item}`
                );
            } else {
                return header == "Error" 
                    ? `${this.options.colors.color_red}${safeValue}` 
                    : `${this.options.colors.color_header}${header}${this.options.colors.color_default}${safeValue}`;
            }
        }).join('<br>');

        container.innerHTML = metadataHTML;

        container.setAttribute('tabindex', '0');
        container.addEventListener('copy', (e) => {
            const selectedText = window.getSelection().toString();
            if (selectedText) {
                e.preventDefault(); 
                navigator.clipboard.writeText(selectedText).catch(err => {
                    console.error('Failed to copy text:', err);
                });
            }
        });

        return container;
    }

    addImageClickHandler() {
        this.log('ImageUploader addImageClickHandler'); 
        const img = this.innerContainer.querySelector('img');
        if (img) {
            img.addEventListener('click', () => this.fileInput.click());
        }
    }

    clearPreviousImage() {
        this.log('ImageUploader clearPreviousImage'); 
        if (this.currentObjectURL) {
            URL.revokeObjectURL(this.currentObjectURL);
            this.currentObjectURL = null;
        }
    }

    destroy() {
        this.log('ImageUploader destroy'); 
        this.clearPreviousImage();
        if(this.innerContainer) {
            this.innerContainer.innerHTML = '';
        }
    }

    async readEXIFMetadata(file) {
        this.log('ImageUploader readEXIFMetadata');
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const data = new DataView(arrayBuffer);
            const metadata = this.getFromEXIFBuffer(data);
            return this.parceMetadata(metadata);
        } catch (error) {
            console.error('Error reading meta', error);
            throw error; 
        }
    }

    getFromEXIFBuffer(data) {
        this.log('ImageUploader getFromEXIFBuffer'); 
        if ((data.getUint8(0) != 0xFF) || (data.getUint8(1) != 0xD8)) {
            return false;
        }

        var offset = 2, length = data.byteLength, marker;
        while (offset < length) {
            if (data.getUint8(offset) != 0xFF) return false;
            marker = data.getUint8(offset + 1);
            if (marker == 225) {
                return this.readEXIFData(data, offset + 4, data.getUint16(offset + 2) - 2);
            } else {
                offset += 2 + data.getUint16(offset+2);
            }
        }
    } 

    readEXIFData(file, start) {
        // ... (Ваш код EXIF без изменений)
        var EXIF = function(obj) {
            if (obj instanceof EXIF) return obj;
            if (!(this instanceof EXIF)) return new EXIF(obj);
            this.EXIFwrapped = obj;
        };

        var TiffTags = EXIF.TiffTags = { 0x8769 : "ExifIFDPointer" };
        var ExifTags = EXIF.Tags = { 0x9286 : "UserComment" };

        function readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd) {
            var type = file.getUint16(entryOffset+2, !bigEnd),
                numValues = file.getUint32(entryOffset+4, !bigEnd),
                valueOffset = file.getUint32(entryOffset+8, !bigEnd) + tiffStart;

            switch (type) {
                case 7: 
                    if (numValues > 6) {
                        return decodeUTF16(file, valueOffset, numValues);
                    }
                    break;
                case 4: 
                    if (numValues == 1) {
                        return file.getUint32(entryOffset + 8, !bigEnd);
                    } 
                    break;
            }
        }

        function readTags(file, tiffStart, dirStart, strings, bigEnd) {
            var entries = file.getUint16(dirStart, !bigEnd),
                tags = {},
                entryOffset, tag, i;

            for (i=0;i<entries;i++) {
                entryOffset = dirStart + i*12 + 2;
                tag = strings[file.getUint16(entryOffset, !bigEnd)];
                tags[tag] = readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd);
            }
            return tags;
        }

        function decodeAscii(buffer, start, length) {
            const decoder = new TextDecoder('ascii'); 
            const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset + start, length);
            return decoder.decode(uint8Array);
        }

        function decodeUTF16(buffer, start, length) {
            const text = decodeAscii(buffer, start, 7);
            if (text != "UNICODE") { 
                return " ";
            }
            const utf16Decoder = new TextDecoder('utf-16le');
            const textStart = start + 7; 
            const textLength = length - 7; 
            if (textLength <= 0) return " "; 
            
            const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset + textStart, textLength);
            return utf16Decoder.decode(uint8Array).replace(/[\x00\uFFFD]+$/g, '').trim();
        }

        if (decodeAscii(file, start, 4) != "Exif") {
            return false;
        }

        var bigEnd, tags = {}, tag, tiffOffset = start + 6;

        if (file.getUint16(tiffOffset) == 0x4949) {
            bigEnd = false;
        } else if (file.getUint16(tiffOffset) == 0x4D4D) {
            bigEnd = true;
        } else {
            return false;
        }

        if (file.getUint16(tiffOffset+2, !bigEnd) != 0x002A) {
            return false;
        }

        var firstIFDOffset = file.getUint32(tiffOffset+4, !bigEnd);
        if (firstIFDOffset < 0x00000008) {
            return false;
        }

        const tiff = readTags(file, tiffOffset, tiffOffset + firstIFDOffset, TiffTags, bigEnd);
        if (tiff.ExifIFDPointer) {
            const exifData = readTags(file, tiffOffset, tiffOffset + tiff.ExifIFDPointer, ExifTags, bigEnd);
            for (tag in exifData) {
                tags["parameters"] = exifData[tag];
            }
        }
        return tags;
    }
}