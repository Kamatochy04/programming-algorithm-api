import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Together } from "together-ai";
import { CompletionCreateParams } from "together-ai/resources/chat/completions";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

interface Task {
  description: string;
  examples: { input: string; output: string }[];
}

app.post("/api/create-task", async (req: Request, res: Response) => {
  try {
    const { difficulty, topics, language } = req.body;

    if (!difficulty || !topics) {
      res.status(400).json({ error: "Difficulty and language are required" });
      return;
    }

    const systemPrompt = `
    Ты - AI-ассистент для генерации алгоритмических задач. Создавай уникальные задачи по следующим требованиям:
    1. Формат ответа - строго JSON
    2. Параметры задачи:
      - Язык программирования: ${language}
      - Уровень сложности: ${difficulty} (новичок/средний/продвинутый)
      - Тема: ${topics}
      - Минимальный размер решения: 10 строк кода

    3. Структура ответа:
    {
      "title": "Название задачи (максимум 7 слов)",
      "description": "Четкое описание задачи на русском (3-5 предложений)",
      "requiredData": [
        {
          "title": "Название структуры/метода",
          "description": "Объяснение на русском (2-3 предложения)",
          "codeExample": "Пример использования (только если требуется, 1-2 строки)" 
        }
      ],
      "examples": [
      {
        "input": "Входные данные в формате, готовом для использования в коде",
        "output": "Ожидаемый результат",
        "explanation": "Краткое пояснение (1 предложение)" 
      }
      ],
      "placeholder": "Заготовка кода с сигнатурой функции на указанном языке"
    }

    4. Особые требования:
      - Задачи должны быть практичными и нешаблонными
      - Для сложных уровней добавляй подсказки в requiredData
      - Примеры input/output должны покрывать edge-cases
      - placeholder должен соответствовать стилю языка ${language}
      - Генерируй разные задачи при каждом запросе

    Пример для языка JavaScript и темы "Работа со строками":
  {
  "title": "Обратная индексация строки",
  "description": "Реализуйте функцию, которая преобразует строку так, чтобы каждое слово было записано в обратном порядке, но порядок слов сохранился.",
  "requiredData": [
    {
      "title": "Метод split()",
      "description": "Разбивает строку на массив подстрок по указанному разделителю.",
      "codeExample": "const words = 'hello world'.split(' ');" 
    },
    {
      "title": "Метод reverse()",
      "description": "Изменяет порядок элементов массива на обратный."
    }
  ],
  "examples": [
    {
      "input": "'Hello world'",
      "output": "'olleH dlrow'",
      "explanation": "Слова перевернуты посимвольно" 
    },
    {
      "input": "'JavaScript is awesome'",
      "output": "'tpircSavaJ si emosewa'",
      "explanation": "Работает с разной длиной слов"
    }
  ],
  "placeholder": "function reverseWords(str) {\n  // Ваш код здесь\n}"
}
    requiredData должны в себе хранить минимум 5 объектов внутри себя связанные с этой задачей 
    

    `;

    const params: CompletionCreateParams = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: systemPrompt },
      ],
      model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      max_tokens: 1024,
      temperature: 0.7,
      response_format: { type: "json_object" },
    };

    const response = await together.chat.completions.create(params);
    const content = response.choices[0]?.message?.content;
    console.log(content);

    if (!content) {
      throw new Error("Invalid response from AI");
    }

    const taskData: Task = JSON.parse(content);
    res.json(taskData);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.post("/api/check-solution", async (req: Request, res: Response) => {
  try {
    const { code, taskDescription } = req.body;
    console.log(req.body);
    if (!code || !taskDescription) {
      res.status(400).json({
        error: "Code and task description are required",
      });
      return;
    }

    const systemPrompt = `
      Я решид алгоритмическую задачу. Условие задачи звучит так: ${taskDescription}
      вот мое решение ${code}. Если я решил ее правельно верни true иначе false (Проверяй и синтаксис тоже. Если в нем ошибка то ты возвращаешь ошибку) в виде
      {
        "isCorrect": true|false
      }
        ели false то напиши что не так в поле description 
         {
        "isCorrect": true|false
        "description": "что не так"
      }
      и ничего больше description пиши на русском 

    `;

    const params: CompletionCreateParams = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: systemPrompt },
      ],
      model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      max_tokens: 512,
      temperature: 0.3,
      response_format: { type: "json_object" },
    };

    const response = await together.chat.completions.create(params);
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Invalid response from AI");
    }

    const result = JSON.parse(content);
    console.log(result);
    res.json(result);
  } catch (error) {
    console.error("Error checking solution:", error);
    res.status(500).json({ error: "Failed to check solution" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
