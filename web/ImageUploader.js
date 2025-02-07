import { app } from "../../../scripts/app.js";
import * as pngMetadata from "../../../scripts/metadata/png.js";

import ComfyUI from "./read_prompt_comfy.js";
import ForgeUI from "./read_prompt_forge.js";

export class ImageUploader {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.options = { ...options };
        this.currentObjectURL = null;
        this.log('ImageUploader constructor');
    }

    ///////////////////////////////////////////

    init() {
        this.log('ImageUploader init');
        this.createElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    ///////////////////////////////////////////

    log(...args) {
        if (this.options.isDebugMode) {
            console.log(...args);
        }
    }

    showToast(severity, summary, detail) {
        app.extensionManager.toast.add({
            severity: severity,
            summary: summary,
            detail: detail,
            life: 3000
        });
    }

    ///////////////////////////////////////////

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
        //this.fileInput.accept = this.options.accept;
        this.fileInput.hidden = true;

        this.dropOverlay = document.createElement('div');
        this.dropOverlay.className = 'drop-overlay';
        //this.dropOverlay.textContent = this.options.dropZoneText;

        this.innerContainer.appendChild(this.button);
        this.innerContainer.appendChild(this.fileInput);
        this.innerContainer.appendChild(this.dropOverlay);
        this.container.appendChild(this.innerContainer);
    }

    ///////////////////////////////////////////

    setupEventListeners() {
        this.log('ImageUploader setupEventListeners');
        this.button.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    ///////////////////////////////////////////

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

    ///////////////////////////////////////////

    handleFileSelect(e) {
        this.log('ImageUploader handleFileSelect');
        const file = e.target.files[0];
        if (!file) return;

        const allowedExtensions = ['image/png'];
        const isImage = allowedExtensions.includes(file.type);

        if (isImage) {
            this.clearPreviousImage();
            this.displayImage(file);
            this.addImageClickHandler();
        } else {
            this.showToast('error', 'PNGInfo Failed', `Unsupported file format`);
            this.fileInput.value = '';
        }
    }

    ///////////////////////////////////////////

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

    ///////////////////////////////////////////

    async readMetadata(file) {
        this.log('ImageUploader readMetadata');
        const baseMetadata = {
            //'File name': file.name,
            //'Last change': new Date(file.lastModified).toLocaleString()
        };

        try {
            if (file.type === 'image/png') {
                const pngData = await this.readPNGMetadata(file);
                return { ...baseMetadata, ...pngData };
            }
            
            //not supported
            /*if (file.type === 'image/jpeg') {
                const exifData = await this.readEXIFMetadata(file);
                return { ...baseMetadata, ...exifData };
            }*/
            
        } catch (error) {
            const error_text = `Error in readMetadata`;
            console.error(`${error_text}: `, error);
            this.showToast('error', 'PNGInfo Failed', `${error_text}`);
        }

        return baseMetadata;
    }

    ///////////////////////////////////////////

    async readPNGMetadata(file) {
        this.log('ImageUploader readPNGMetadata');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const metadata = pngMetadata.getFromPngBuffer(data);
                    resolve(this.formatPNGMetadata(metadata));
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    ///////////////////////////////////////////

    formatPNGMetadata(metadata) {   
        this.log('ImageUploader formatPNGMetadata'); 
        this.log(metadata);

        let result = {};

        try{ 
            if (metadata && metadata.parameters) {
                const forge_parcer = new ForgeUI(metadata.parameters, {
                    isDebugMode: this.options.isDebugMode,
                    colors: this.options.colors
                });
                forge_parcer.run();
                result = forge_parcer.output;
                return result;
            }
        } catch (error) {
            const error_text = "Error in parameters section";
            result["Error"] = `${error_text}`;
        }

        try{ 
            if (metadata && metadata.prompt) {
                const comfy_parcer = new ComfyUI(metadata.prompt, {
                    isDebugMode: this.options.isDebugMode,
                    colors: this.options.colors
                });
                comfy_parcer.run();
                result = comfy_parcer.output;
                return result;
            }
        } catch (error) {
            const error_text = "Error in prompt section";
            result["Error"] = `${error_text}`;
        }

        if (Object.keys(result).length === 0) {
            const error_text = "No parameters or prompt sections in metadata";
            result["Error"] = `${error_text}`;
        }

        return result;
    }

    ///////////////////////////////////////////

    createMetadataContainer(metadata) {
        this.log('ImageUploader createMetadataContainer'); 

        const container = document.createElement('div');
        container.className = 'image-metadata';

        const metadataHTML = Object.entries(metadata)
            .map(([header, value]) => 
                header == "Error" ? `${this.options.colors.color_red}${value}` :
                   `${this.options.colors.color_header}${header}${this.options.colors.color_default}${value}`
            ).join('<br>');

        container.innerHTML = metadataHTML;
        return container;
    }

    ///////////////////////////////////////////

    addImageClickHandler() {
        this.log('ImageUploader addImageClickHandler'); 

        const img = this.innerContainer.querySelector('img');
        if (img) {
            img.addEventListener('click', () => this.fileInput.click());
        }
    }

    ///////////////////////////////////////////

    clearPreviousImage() {
        this.log('ImageUploader clearPreviousImage'); 
        if (this.currentObjectURL) {
            URL.revokeObjectURL(this.currentObjectURL);
            this.currentObjectURL = null;
        }
    }

    ///////////////////////////////////////////

    destroy() {
        this.log('ImageUploader destroy'); 
        this.clearPreviousImage();
        this.innerContainer.removeEventListener('dragover', preventDefault);
        this.innerContainer.removeEventListener('dragleave', preventDefault);
        this.innerContainer.removeEventListener('drop', preventDefault);
        this.container.innerHTML = '';
    }
}