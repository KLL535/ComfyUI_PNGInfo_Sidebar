import BaseFormat from "./read_prompt_base.js";

export default class ComfyUI extends BaseFormat {
    constructor(raw = "", options = {}) {
        super(raw,options);

        this.log('ComfyUI prompt reader start');      

        this.files_type = ['.safetensors','.ckpt','.bin','.gguf','.pt','.txt','.png','.jpg','.jpeg']; 
    }

    run() {

      try {

        this.log('Start parce');    

        this.log('Open JSON');

        this.raw = this.raw.replace(/NaN/g, 'null'); 
        const json = JSON.parse(this.raw);

        this.log(json);

        this.log('Parce JSON');      

        const resultDict = {};

        for (const [id, node] of Object.entries(json)) {

            if (node.inputs) {
              for (const key in node.inputs) {
                if (Array.isArray(node.inputs[key]) && node.inputs[key].length === 0) continue;
                if (!Array.isArray(node.inputs[key])) { 
                  if (node.inputs[key]) {
                    if (node.inputs[key].toString() != "")  {
                      if (!resultDict[key]) {
                        resultDict[key] = [];
                      }
                      resultDict[key].push( { value: node.inputs[key], id } );
                    }
                  }  
                } else {
                  //array value not informal
                }
              }
            }

        }    

        this.log(resultDict);  

        let result = {};

        function processKeyValue(obj, key, value) {
            if (obj.hasOwnProperty(key)) {
                if (!Array.isArray(obj[key])) {
                    obj[key] = [obj[key]];
                }
                if (!obj[key].includes(value)) {
                    obj[key].push(value); 
                }
            } else {
                obj[key] = value;
            }
        }
        
        for (const key in resultDict) {
            if (Array.isArray(resultDict[key])) {
                for (const { value, id } of resultDict[key]) {

                    this.log(key);  
                    this.log(value);  

                    const _key = `${this.escapeHTML(key)}`;   
                    
                    if (value === null) continue;
                    if (Array.isArray(value)) continue;

                    if (typeof value !== 'object') {
                        //non object
                         const _value = `${this.escapeHTML(value.toString())}`;        

                        if (this.isNumber(_value)) {
                            processKeyValue(result, `${_key}: `, `${this.options.colors.color_int}${_value}`);
                        } else if (this.files_type.some(ext => _value.includes(ext))) {
                            processKeyValue(result, `${_key}: `, `${this.options.colors.color_file}${_value}`);
                        }  
                        else{
                            processKeyValue(result, `${_key}: `, `${_value}`);
                        }
                    }
                    else
                    {
                        //object
                        const entries = Object.entries(value);
                        const parts = entries.map(([key, value]) => {
                            return `${key}: ${value}`;
                        });
                        const text = this.escapeHTML(parts.join(', '));
                        processKeyValue(result, `${_key}: `, `${text}`);
                    }
                }
            }
        }       

        this.log(result);  

        this._output = result;
 
        this.log('End parce');    

      } catch (error) {
          const error_text = "Error in parce";
          console.error(`${error_text}: ${error.message}`);
          throw error;
      }
    }

}






    


