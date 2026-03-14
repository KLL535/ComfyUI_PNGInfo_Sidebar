import BaseFormat from "./read_prompt_base.js";

export default class ForgeUI extends BaseFormat {
    constructor(raw = "", options = {}) {
        super(raw, options);

        this.log('Forge prompt reader start');

        this.positive = '';
        this.negative = '';
        this.lora = '';
        this.params = [];
        this.llmSystem = '';   // <-- новое поле
        this.llmUser = '';     // <-- новое поле
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

        // === 1. Сначала извлекаем LoRA (<...>) ===
        const lora = first_line.match(/<[^>]+>/g);
        this.log(`LoRAs: ${lora}`);
        this.lora = lora;

        // Удаляем LoRA из строки для чистого парсинга секций
        let parseLine = first_line.replace(/<[^>]+>/g, "");

        let positive = "";
        let negative = "";
        let llmSystem = "";
        let llmUser = "";

        // === 2. Сепараторы ===
        const sepNegative = "Negative prompt:";
        const sepUser = "LLM_user_prompt:";
        const sepSystem = "LLM_system_prompt:";

        // === 3. Обрезаем с конца в обратном порядке ===
        // Negative prompt: идёт последним
        if (parseLine.includes(sepNegative)) {
            const idx = parseLine.lastIndexOf(sepNegative);
            negative = parseLine.slice(idx + sepNegative.length).trim();
            parseLine = parseLine.slice(0, idx);
        }

        // LLM_user_prompt: идёт перед негативом
        if (parseLine.includes(sepUser)) {
            const idx = parseLine.lastIndexOf(sepUser);
            llmUser = parseLine.slice(idx + sepUser.length).trim();
            parseLine = parseLine.slice(0, idx);
        }

        // LLM_system_prompt: идёт перед юзером
        if (parseLine.includes(sepSystem)) {
            const idx = parseLine.lastIndexOf(sepSystem);
            llmSystem = parseLine.slice(idx + sepSystem.length).trim();
            parseLine = parseLine.slice(0, idx);
        }

        // === 4. Всё, что осталось в начале — positive ===
        positive = parseLine.trim();

        // === 5. Очистка краёв ===
        positive = this.cleanEdges(positive);
        negative = this.cleanEdges(negative);
        llmSystem = this.cleanEdges(llmSystem);
        llmUser = this.cleanEdges(llmUser);

        // === 6. Финальная подчистка positive от возможных остатков <...> ===
        positive = positive.replace(/<[^>]+>/g, "").trim();

        // === 7. Логирование ===
        this.log(`Positive prompt: ${positive}`);
        this.log(`Negative prompt: ${negative}`);
        this.log(`LLM system prompt: ${llmSystem}`);
        this.log(`LLM user prompt: ${llmUser}`);

        // === 8. Сохранение в поля класса ===
        this.positive = positive;
        this.negative = negative;
        this.llmSystem = llmSystem;
        this.llmUser = llmUser;

        // === 9. Генерируем результат ===   
        let result = {};
        result["Prompt:<br>"] = `${this.escapeHTML(positive)}`;

        if (llmSystem !== "") {
           result["LLM_system_prompt:<br>"] = `${this.escapeHTML(llmSystem)}`;
        }

        if (llmUser !== "") {
           result["LLM_user_prompt:<br>"] = `${this.escapeHTML(llmUser)}`;
        }

        if (negative !== "") {
           result["Negative Prompt:<br>"] = `${this.escapeHTML(negative)}`;
        }

        if (lora) {
          let lora_text = "";
          for (let i = 0; i < lora.length; i++) {
            const pattern = /<(.*?):(.*?)(?::(.*?))?>/g;        
            const text = lora[i].replace(pattern, (match, prefix, name, weight) => {
                if (weight !== undefined) {
                    // Вариант с весом: <lora:name:weight>
                    return `&lt${prefix}:${this.options.colors.color_file}${name}${this.options.colors.color_default}:${this.options.colors.color_int}${weight}${this.options.colors.color_default}&gt`;
                } else {
                    // Вариант без веса: <lora:name>
                    return `&lt${prefix}:${this.options.colors.color_file}${name}${this.options.colors.color_default}&gt`;
                }
            });
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
              result[`${key}: `] = `${this.options.colors.color_int}${text}`;
          } else if (key == "Model") {
              result[`${key}: `] = `${this.options.colors.color_file}${text}`;
          } else {
              result[`${key}: `] = `${text}`;
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
        
        const parts = this.splitWithJsonAndQuotes(text);

        for (const part of parts) {
            if (!part.trim()) continue;
            const colonIndex = part.indexOf(':');
            if (colonIndex === -1) continue;

            const key = part.slice(0, colonIndex).trim();
            let value = part.slice(colonIndex + 1).trim();

            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1); 
            }

            if (value.endsWith(',')) {
                value = value.slice(0, -1).trim();
            }

            result.push({ key, value });
        }

        return result;
    }

    splitWithJsonAndQuotes(text) {
        let parts = [];
        let currentPart = '';
        let inJsonBlock = false;
        let inQuoteBlock = false;
        let jsonDepth = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === '"') {
                inQuoteBlock = !inQuoteBlock;
            }

            if (!inQuoteBlock) {
                if (char === '[' || char === '{') {
                    jsonDepth++;
                    inJsonBlock = true;
                } else if (char === ']' || char === '}') {
                    if (jsonDepth > 0) {
                        jsonDepth--;
                    }
                    if (jsonDepth === 0) {
                        inJsonBlock = false;
                    }
                }
            }

            const isDelimiter = char === ',' && !inJsonBlock && !inQuoteBlock;
            if (isDelimiter) {
                const input = currentPart.trim();
                if (input) {
                    const parts2 = this.parseCivitAIblock(input);
                    if (parts2.length > 0) { 
                        parts = parts.concat(parts2); 
                    } else {
                        parts.push(input);
                    }
                }
                currentPart = '';
            } else {
                currentPart += char;
            }
        }

        const input = currentPart.trim();
        if (input) {
            const parts2 = this.parseCivitAIblock(input);
            if (parts2.length > 0) { 
                parts = parts.concat(parts2); 
            } else {
                parts.push(input);
            }
        }

        return parts;
    }

    parseCivitAIblock(text) {
        const substring = "Civitai resources:";

        if (!text.includes(substring)) {
            return [];
        }

        const startIndex = text.indexOf(substring) + substring.length;
        let input = text.slice(startIndex).trim();

        if (!input.startsWith('[') || !input.endsWith(']')) {
            return [];
        }

        try {

            this.log("Civitai resources");

            const jsonArray = JSON.parse(input);

            if (!Array.isArray(jsonArray)) {
                this.log("Not Array");
                return [];
            }

            const parts = [];
            jsonArray.forEach(item => {
                const type = item.type;
                const modelVersionId = item.modelVersionId;
                const weight = item.weight;

                let output = `${type}:id=${modelVersionId}`;
                if (weight !== undefined) {
                    output += `, weight=${weight}`;
                }
                parts.push(output);
            });
            return parts;

        } catch (error) {
            this.log("Error in parseCivitAIblock: ", error.message);
            return [];
        }
    }

}