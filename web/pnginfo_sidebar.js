import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";

import { ImageUploader } from './ImageUploader.js';

///////////////////////////////////////////

const DEF_FONT_NAME =         'Arial';
const DEF_FONT_SIZE =         10;
const DEF_IMAGE_SIZE =        100;

const DEF_COLOR_TEXT =        '000000';
const DEF_COLOR_FILE =        '008000';
const DEF_COLOR_NUMBER =      'B8860B';
const DEF_COLOR_HEADER =      '0D61FE';

const DEF_COLOR_DARK_TEXT =   'CFCFCF';
const DEF_COLOR_DARK_FILE =   'FF8080';
const DEF_COLOR_DARK_NUMBER = 'FFFF00';
const DEF_COLOR_DARK_HEADER = '808080';

class PNGInfo_SideBar {
    constructor(app) {
        this.isDebugMode = false;

        this.app = app;

        this.log('PNGInfo constructor start');

        //settings
        this.fontName = this.getSettingValue("PNGInfo.General.FontName", DEF_FONT_NAME);
        this.fontSize = this.getSettingValue("PNGInfo.General.FontSize", DEF_FONT_SIZE);
        this.imageSize = this.getSettingValue("PNGInfo.General.ImageSize", DEF_IMAGE_SIZE);
        this.color_default = this.default_color_check(this.getSettingValue("PNGInfo.Colors.Text", DEF_COLOR_TEXT));
        this.color_file = this.default_color_check(this.getSettingValue("PNGInfo.Colors.File", DEF_COLOR_FILE));
        this.color_int = this.default_color_check(this.getSettingValue("PNGInfo.Colors.Number", DEF_COLOR_NUMBER));
        this.color_header = this.default_color_check(this.getSettingValue("PNGInfo.Colors.Header", DEF_COLOR_HEADER));
        this.color_dark_default = this.default_color_check(this.getSettingValue("PNGInfo.Colors (Dark Theme).Text", DEF_COLOR_DARK_TEXT));
        this.color_dark_file = this.default_color_check(this.getSettingValue("PNGInfo.Colors (Dark Theme).File", DEF_COLOR_DARK_FILE));
        this.color_dark_int = this.default_color_check(this.getSettingValue("PNGInfo.Colors (Dark Theme).Number", DEF_COLOR_DARK_NUMBER));
        this.color_dark_header = this.default_color_check(this.getSettingValue("PNGInfo.Colors (Dark Theme).Header", DEF_COLOR_DARK_HEADER));

        this.colors = {
            color_default: `<span class="my-color-default">`,
            color_header: `<span class="my-color-header">`,
            color_int: `<span class="my-color-int">`,
            color_file: `<span class="my-color-file">`,
            color_red: `<span class="my-color-red">`
        };

        this.uploaderContainer = $el("div.uploader-container");
        this.imageUploader = new ImageUploader(this.uploaderContainer, {
                isDebugMode : this.isDebugMode,
                colors:   this.colors,
        });

        this.createStyles();
        this.imageUploader.init();

        this.element = $el("div.PNGInfo-popup", [
            this.uploaderContainer 
        ]);   

        this.changeStyles_font_size();
        this.changeStyles_font_name();
        this.changeStyles_image();
        this.changeStyles_colors();

        this.initColorThemeObserver();    

        this.log('PNGInfo constructor end');
    }

///////////////////////////////////////////

    getSettingValue(value,def) {
        const result = app.extensionManager.setting.get(value);
        if (result) { 
            return result;
        } else {
            return def;
        }
    }

///////////////////////////////////////////

    update() {
        this.log('PNGInfo update');
    }

    log(...args) {
        if (this.isDebugMode) {
            console.log(...args);
        }
    }

///////////////////////////////////////////

    createStyles() {
        this.log('PNGInfo createStyles');
        const style = document.createElement('style');
        style.textContent = `
            .image-uploader-container {
                margin: 2px;
                position: relative;
                /*display: flex;*/
                /*align-items: center;*/
                padding-top: 10px;
                flex-direction: column;
            }
                    
            .image-uploader-button {
                font-size: var(--my-button-font-size) !important;
                width: var(--my-button-size) !important;
                height: var(--my-button-size) !important;
                /*text-align: center;*/
                /*align-items: center;*/
                /*justify-content: center;*/
                border: 2px dashed;
                border-radius: 5px;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            
            .image-uploader-preview {
                max-width: var(--my-image-size) !important;
                height: auto;
                border: 2px dashed #ddd;
                border-radius: 4px;
                cursor: pointer;
                transition: opacity 0.2s;
            }

            .drop-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                color: white;
                display: none;
                justify-content: center;
                align-items: center;
                text-align: center;
                pointer-events: none;
                border: 2px dashed;
                line-height: 1;
                border-radius: 5px;
            }

            .drop-overlay.active {
                display: flex;
            }

            .image-metadata {
                margin-top: 0px;
                padding: 0px;
                /*background: rgba(0,0,0,0.03);*/
                /*border-radius: 0px;*/
                font-size: var(--my-font-size) !important;
                word-break: break-word;
                font: var(--my-font-name) !important;
            }

            .my-color-header {
                color: var(--my-color-header) !important;
            }

            .my-color-file {
                color: var(--my-color-file) !important;
            }

            .my-color-int {
                color: var(--my-color-int) !important;
            }

            .my-color-red {
                color: var(--my-color-red) !important;
            }

            .my-color-default {
                color: var(--my-color-default) !important;
            }
        `;
        this.uploaderContainer.appendChild(style);
    }

    changeStyles_font_size() {
        this.log('PNGInfo changeStyles_font_size');
        document.documentElement.style.setProperty('--my-font-size', `${this.fontSize}px`);
   }

    changeStyles_image() {
        this.log('PNGInfo changeStyles_image');
        document.documentElement.style.setProperty('--my-image-size', `${this.imageSize}px`);
        document.documentElement.style.setProperty('--my-button-size', `${this.imageSize}px`);
        document.documentElement.style.setProperty('--my-button-font-size', `${Math.max(20, this.imageSize/3)}px`);
    }

    changeStyles_colors() {
        this.log('PNGInfo changeStyles_colors');
        const isDark = document.body.classList.contains('dark-theme');
        if (isDark) {
            document.documentElement.style.setProperty('--my-color-header', this.color_dark_header);
            document.documentElement.style.setProperty('--my-color-file', this.color_dark_file);
            document.documentElement.style.setProperty('--my-color-int', this.color_dark_int);    
            document.documentElement.style.setProperty('--my-color-default', this.color_dark_default);
        }
        else
        {
            document.documentElement.style.setProperty('--my-color-header', this.color_header);
            document.documentElement.style.setProperty('--my-color-file', this.color_file);
            document.documentElement.style.setProperty('--my-color-int', this.color_int);    
            document.documentElement.style.setProperty('--my-color-default', this.color_default);
        }
        document.documentElement.style.setProperty('--my-color-red', '#FF0000');
    }

    changeStyles_font_name() {
        this.log('PNGInfo changeStyles_font_name');

        const input = this.fontName.trim();
        const parts = input.split(/\s+/);
    
        let family = [];
        let style = 'normal';
        let weight = 'normal';
    
        const styles = ['italic', 'oblique', 'normal'];
        const weights = ['bold', 'bolder', 'lighter', ...Array.from({length: 9}, (_, i) => `${(i + 1)*100}`)];

        while(parts.length > 0) {
            const last = parts[parts.length - 1].toLowerCase();
            if(weights.includes(last)) {
                weight = parts.pop();
                continue;
            }
            if(styles.includes(last)) {
                style = parts.pop();
                continue;
            }
            break;
        }
    
        family = parts.join(' ');
        
        const fontSize = 'var(--my-font-size)';
        const fontValue = `${style} ${weight} ${fontSize} "${family}"`;
    
        document.documentElement.style.setProperty('--my-font-name', fontValue);
    }

///////////////////////////////////////////

    initColorThemeObserver() {
        this.log('PNGInfo initColorThemeObserver');
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
              this.changeStyles_colors();
            }
          });
        });

        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['class']
        });
    }

///////////////////////////////////////////

    update_ImageSize(newVal) {
        this.log('PNGInfo update_ImageSize');
        this.imageSize = newVal;
        this.changeStyles_image();
    }

    update_FontSize(newVal) {
        this.log('PNGInfo update_FontSize');
        this.fontSize = newVal;
        this.changeStyles_font_size();
    }

    update_FontName(newVal) {
        this.log('PNGInfo update_FontName');
        this.fontName = newVal;
        this.changeStyles_font_name();
    }

    isValidHexColor(newVal) {
        const regex = /^#([A-Fa-f0-9]{6})$/;
        return regex.test(newVal);
    }

    default_color_check(_newVal) {
        const newVal = '#'+_newVal;
        if ((newVal == 'default') || (this.isValidHexColor(newVal) == false)) {
            return 'var(--fg-color)';
        }
        return newVal;
    }

    update_color_header(newVal) {
        this.log('PNGInfo update_color_header');
        this.color_header = this.default_color_check(newVal);        
        this.changeStyles_colors();
    }

    update_color_int(newVal) {
        this.log('PNGInfo update_color_int');
        this.color_int = this.default_color_check(newVal);  
        this.changeStyles_colors();
    }

    update_color_file(newVal) {
        this.log('PNGInfo update_color_file');
        this.color_file = this.default_color_check(newVal);  
        this.changeStyles_colors();
    }

    update_color_default(newVal) {
        this.log('PNGInfo update_color_default');
        this.color_default = this.default_color_check(newVal);  
        this.changeStyles_colors();
    }

    update_color_dark_header(newVal) {
        this.log('PNGInfo update_color_dark_header');
        this.color_dark_header = this.default_color_check(newVal);  
        this.changeStyles_colors();
    }

    update_color_dark_int(newVal) {
        this.log('PNGInfo update_color_dark_int');
        this.color_dark_int = this.default_color_check(newVal);  
        this.changeStyles_colors();
    }

    update_color_dark_file(newVal) {
        this.log('PNGInfo update_color_dark_file');
        this.color_dark_file = this.default_color_check(newVal);  
        this.changeStyles_colors();
    }

    update_color_dark_default(newVal) {
        this.log('PNGInfo update_color_dark_default');
        this.color_dark_default = this.default_color_check(newVal);  
        this.changeStyles_colors();
    }

}

///////////////////////////////////////////

app.registerExtension({
    name: "comfy.PNGInfo.SideBar",
    async setup() {

        //register settings enable
        app.ui.settings.addSetting({
            id: "PNGInfo.General.Enable",
            name: "Enable (after restart)",
            type: "boolean",
            defaultValue: true,
            onChange: (newVal, oldVal) => { },
        });

        const enable = app.ui.settings.getSettingValue("PNGInfo.General.Enable", true);
        if (enable == false) return;

        //register settings ImageSize
        app.ui.settings.addSetting({
            id: "PNGInfo.General.ImageSize",
            name: "Image Size",
            type: "slider",
            attrs: { min: 20, max: 500, step: 10 },
            defaultValue: DEF_IMAGE_SIZE,
            onChange: (newVal, oldVal) => {
                if (app.PNGInfo) {
                    app.PNGInfo.update_ImageSize(newVal);
                }
            },
        });

        //register settings FontSize
        app.ui.settings.addSetting({
            id: "PNGInfo.General.FontSize",
            name: "Font Size",
            type: "slider",
            attrs: { min: 4, max: 40, step: 0.5 },
            defaultValue: DEF_FONT_SIZE,
            onChange: (newVal, oldVal) => {
                if (app.PNGInfo) {
                    app.PNGInfo.update_FontSize(newVal);
                }
            },
        });

        //register settings FontName
        app.ui.settings.addSetting({
            id: "PNGInfo.General.FontName",
            name: "Font Name",
            type: "string",
            defaultValue: DEF_FONT_NAME,
            onChange: (newVal, oldVal) => {
                if (app.PNGInfo) {
                    app.PNGInfo.update_FontName(newVal);
                }
            },
        });

        //register settings colors

        app.ui.settings.addSetting({
            id: "PNGInfo.Colors.Header",
            name: "Color Header",
            type: "color",
            defaultValue: DEF_COLOR_HEADER, 
            onChange: (newVal, oldVal) => { if (app.PNGInfo) { app.PNGInfo.update_color_header(newVal); } },
        });

        app.ui.settings.addSetting({
            id: "PNGInfo.Colors.Number",
            name: "Color Number",
            type: "color",
            defaultValue: DEF_COLOR_NUMBER, 
            onChange: (newVal, oldVal) => { if (app.PNGInfo) { app.PNGInfo.update_color_int(newVal); } },
        });

        app.ui.settings.addSetting({
            id: "PNGInfo.Colors.File",
            name: "Color File",
            type: "color",
            defaultValue: DEF_COLOR_FILE,
            onChange: (newVal, oldVal) => { if (app.PNGInfo) { app.PNGInfo.update_color_file(newVal); } },
        });

        app.ui.settings.addSetting({
            id: "PNGInfo.Colors.Text",
            name: "Color Text",
            type: "color",
            defaultValue: DEF_COLOR_TEXT,
            onChange: (newVal, oldVal) => { if (app.PNGInfo) { app.PNGInfo.update_color_default(newVal); } },
        });

        //register settings colors (dark)

        app.ui.settings.addSetting({
            id: "PNGInfo.Colors (Dark Theme).Header",
            name: "Color Header",
            type: "color",
            defaultValue: DEF_COLOR_DARK_HEADER, 
            onChange: (newVal, oldVal) => { if (app.PNGInfo) { app.PNGInfo.update_color_dark_header(newVal); } },
        });

        app.ui.settings.addSetting({
            id: "PNGInfo.Colors (Dark Theme).Number",
            name: "Color Number",
            type: "color",
            defaultValue: DEF_COLOR_DARK_NUMBER, 
            onChange: (newVal, oldVal) => { if (app.PNGInfo) { app.PNGInfo.update_color_dark_int(newVal); } },
        });

        app.ui.settings.addSetting({
            id: "PNGInfo.Colors (Dark Theme).File",
            name: "Color File",
            type: "color",
            defaultValue: DEF_COLOR_DARK_FILE, 
            onChange: (newVal, oldVal) => { if (app.PNGInfo) { app.PNGInfo.update_color_dark_file(newVal); } },
        });

        app.ui.settings.addSetting({
            id: "PNGInfo.Colors (Dark Theme).Text",
            name: "Color Text",
            type: "color",
            defaultValue: DEF_COLOR_DARK_TEXT, 
            onChange: (newVal, oldVal) => { if (app.PNGInfo) { app.PNGInfo.update_color_dark_default(newVal); } },
        });

        //create tab

        const PNGInfo = new PNGInfo_SideBar(app);
        app.PNGInfo = PNGInfo; 
   
        app.extensionManager.registerSidebarTab({
            id: "PNGInfo.SideBar",
            icon: "pi pi-id-card",
            title: "PNG Info",
            tooltip: "PNG Info",
            type: "custom",
            render: (el) => {
               el.appendChild(PNGInfo.element);
               PNGInfo.update(); 
            },
        });

    },
});
