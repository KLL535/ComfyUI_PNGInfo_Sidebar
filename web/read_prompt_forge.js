import BaseFormat from "./read_prompt_base.js";

export default class ForgeUI extends BaseFormat {
    constructor(raw = "", options = {}) {
        super(raw,options);

        this.log('Forge prompt reader start');     

        this.positive = '';
        this.negative = '';  
        this.lora = '';  
        this.params = [];
    }

    run() {

      try {

        this.log('Start parce');      

        this.log(this.raw);      

        let lines = this.raw.split('\n');   

        //get last line
        let last_line = '';
        if (lines.length > 0) {
          last_line = lines[lines.length - 1];
        } 

       this.log(lines.length);    

        //cut last line
        let first_line = '';
        if (lines.length == 1) {
          first_line = lines[0];
        }
        else if (lines.length > 1) {
          const without_last = lines.slice(0, -1);
          first_line = without_last.join('\n');
        }

        let positive = "";
        let negative = "";
        const separator = "Negative prompt:";
        if (first_line.includes(separator)) {
          const separatorIndex = first_line.indexOf(separator);
          positive = first_line.slice(0, separatorIndex).trim();
          negative = first_line.slice(separatorIndex + separator.length).trim();
        } 
        else {
          positive = first_line.trim();
        }
        this.log(`Positive prompt: ${positive}`)
        this.log(`Negative prompt: ${negative}`)

        //get loras
        const lora = positive.match(/<[^>]+>/g);
        this.log(`LoRAs: ${lora}`)
        this.log(`Last line: ${last_line}`)    

        this.lora = lora;

        //cat loras
        positive = positive.replace(/<[^>]+>/g,"");

        //fix
        positive = this.cleanEdges(positive);
        negative = this.cleanEdges(negative);

        this.positive = positive;
        this.negative = negative;

        //generate prompt   
        let result = {};
        result["Prompt:<br>"] = `${this.escapeHTML(positive)}`;

        if (negative !== "") {
           result["Negative Prompt:<br>"] = `${this.escapeHTML(negative)}`;
        }

        if (lora) {
          let lora_text = "";
          for (let i = 0; i < lora.length; i++) {
            const text = lora[i].replace(/<(.*?):(.*?):(.*?)>/g, `&lt$1:${this.options.colors.color_file}$2${this.options.colors.color_default}:${this.options.colors.color_int}$3${this.options.colors.color_default}&gt`);
            lora_text = lora_text + "<br>" + text;
          }
          result["LoRA:"] = `${lora_text}`;
        }

        const params = this.parseParameters(last_line);
        for (let i = 0; i < params.length; i++) {
          const obj = params[i];
          const key = `${this.escapeHTML(obj.key)}`;        
          const text = `${this.escapeHTML(obj.value)}`;        

          if (this.isNumber(obj.value)) {
              result[`${key}: `] = `${this.options.colors.color_int}${text}`
          } else if (key == "Model") {
              result[`${key}: `] = `${this.options.colors.color_file}${text}`
          } else {
              result[`${key}: `] = `${text}`
          }  
        }

        this.params = params;

        this.log(params);  

        this._output = result;

        this.log(result);  

        this.log('End parce');   

      } catch (error) {
          const error_text = "Error in parce";
          console.error(`${error_text}: ${error.message}`);
          throw error;
      }
    }

    parseParameters(text) {
        const result = [];
        const parts = text.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        for (const part of parts) {
          if (!part.trim()) continue;
          const colonIndex = part.indexOf(':');
          if (colonIndex === -1) continue;
          const key = part.slice(0,colonIndex).trim();
          let value = part.slice(colonIndex+1).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1,-1);
          }
          result.push({key, value})
        } 
        return result;
    }

}






    


