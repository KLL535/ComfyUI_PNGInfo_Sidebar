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

        const allowedExtensions = ['image/png', 'image/jpeg'];
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

    ///////////////////////////////////////////

    async readPNGMetadata(file) {
        this.log('ImageUploader readPNGMetadata');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const metadata = pngMetadata.getFromPngBuffer(data);
                    resolve(this.parceMetadata(metadata));
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    ///////////////////////////////////////////

    parceMetadata(metadata) {   
        this.log('ImageUploader parceMetadata'); 
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

    ///////////////////////////////////////////

    async readEXIFMetadata(file) {
        this.log('ImageUploader readEXIFMetadata'); 

        const buffer = await file.arrayBuffer();
        var dataView = new DataView(buffer);

        this.log("Got buffer of length " + buffer.byteLength);
        if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
            this.log("Not a valid JPEG");
            return false; // not a valid jpeg
        }

        var offset = 2,
            length = buffer.byteLength,
            marker;

        while (offset < length) {
            if (dataView.getUint8(offset) != 0xFF) {
                this.log("Not a valid marker at offset " + offset + ", found: " + dataView.getUint8(offset));
                return false; // not a valid marker, something is wrong
            }

            marker = dataView.getUint8(offset + 1);
            this.log(marker);

            if (marker == 225) {
                this.log("Found 0xFFE1 marker");
                return this.readEXIFData(dataView, offset + 4, dataView.getUint16(offset + 2) - 2);
            } else {
                offset += 2 + dataView.getUint16(offset+2);
            }

        }

    }

    readEXIFData(file, start) {

        this.log('ImageUploader readEXIFData'); 

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
                valueOffset = file.getUint32(entryOffset+8, !bigEnd) + tiffStart,
                offset;

            switch (type) {
                case 7: // undefined, 8-bit byte, value depending on field
                    offset = numValues > 4 ? valueOffset : (entryOffset + 8);
                    return getStringFromDB(file, offset + 7, numValues-8);

                case 4: // long, 32 bit int
                    if (numValues == 1) {
                        return file.getUint32(entryOffset + 8, !bigEnd);
                    } 
            }
        }

        function readTags(file, tiffStart, dirStart, strings, bigEnd) {
            var entries = file.getUint16(dirStart, !bigEnd),
                tags = {},
                entryOffset, tag,
                i;

            for (i=0;i<entries;i++) {
                entryOffset = dirStart + i*12 + 2;
                tag = strings[file.getUint16(entryOffset, !bigEnd)];
                tags[tag] = readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd);
            }
            return tags;
        }

        function getStringFromDB(buffer, start, length) {
            var outstr = "";
            for (var n = start; n < start+length; n++) {
                outstr += String.fromCharCode(buffer.getUint8(n));
            }
            return outstr;
        }

        if (getStringFromDB(file, start, 4) != "Exif") {
            this.log("Not valid EXIF data! " + getStringFromDB(file, start, 4));
            return false;
        }

        var bigEnd,
            tags = {}, 
            tag,
            tiffOffset = start + 6;

        // test for TIFF validity and endianness
        if (file.getUint16(tiffOffset) == 0x4949) {
            bigEnd = false;
        } else if (file.getUint16(tiffOffset) == 0x4D4D) {
            bigEnd = true;
        } else {
            this.log("Not valid TIFF data! (no 0x4949 or 0x4D4D)");
            return false;
        }

        if (file.getUint16(tiffOffset+2, !bigEnd) != 0x002A) {
            this.log("Not valid TIFF data! (no 0x002A)");
            return false;
        }

        var firstIFDOffset = file.getUint32(tiffOffset+4, !bigEnd);

        if (firstIFDOffset < 0x00000008) {
            this.log("Not valid TIFF data! (First offset less than 8)", file.getUint32(tiffOffset+4, !bigEnd));
            return false;
        }

        const tiff = readTags(file, tiffOffset, tiffOffset + firstIFDOffset, TiffTags, bigEnd);

        if (tiff.ExifIFDPointer) {
            const exifData = readTags(file, tiffOffset, tiffOffset + tiff.ExifIFDPointer, ExifTags, bigEnd);
            for (tag in exifData) {
                tags["parameters"] = exifData[tag];
            }
        }

        this.log(tags);

        return this.parceMetadata(tags);
    }

}