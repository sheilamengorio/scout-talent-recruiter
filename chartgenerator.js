import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey:
    "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",
});

const MODEL = "o3-mini";

const tools = [
  {
    type: "function",
    function: {
      name: "getCSVData",
      description: "Get the CSV data required to generate a report",
      parameters: {
        type: "object",
        properties: {
          columnsToInclude: {
            type: "array",
            items: {
              enum: ["state", "country"],
            },
          },
        },
        required: ["columnsToInclude"],
        additionalProperties: false,
      },
      // strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "build_chart_schema",
      description:
        "A function that builds a schema for creating a Chart.js chart in a React application",
      // strict: true,
      parameters: {
        type: "object",
        required: ["chart_type", "data", "options"],
        properties: {
          chart_type: {
            type: "string",
            description: "Type of the chart (e.g., 'bar', 'line', 'pie')",
          },
          data: {
            type: "object",
            description: "Data to be used for the chart",
            properties: {
              labels: {
                type: "array",
                description: "Array of labels for the chart",
                items: {
                  type: "string",
                  description: "Label for each data point",
                },
              },
              datasets: {
                type: "array",
                description: "Array of datasets for the chart",
                items: {
                  type: "object",
                  properties: {
                    label: {
                      type: "string",
                      description: "Label for the dataset",
                    },
                    data: {
                      type: "array",
                      description: "Array of data points",
                      items: {
                        type: "number",
                        description: "Data point value",
                      },
                    },
                    backgroundColor: {
                      type: "string",
                      description: "Color of the dataset bars/lines",
                    },
                  },
                  additionalProperties: false,
                  required: ["label", "data", "backgroundColor"],
                },
              },
            },
            additionalProperties: false,
            required: ["labels", "datasets"],
          },
          options: {
            type: "object",
            description: "Configuration options for the chart",
            properties: {
              responsive: {
                type: "boolean",
                description:
                  "Whether the chart should maintain its aspect ratio or not",
              },
              plugins: {
                type: "object",
                description: "Plugin options for Chart.js",
                properties: {
                  tooltip: {
                    type: "object",
                    description: "Tooltip options",
                    properties: {
                      enabled: {
                        type: "boolean",
                        description: "Whether tooltips are enabled",
                      },
                    },
                    additionalProperties: false,
                    required: ["enabled"],
                  },
                },
                additionalProperties: false,
                required: ["tooltip"],
              },
            },
            additionalProperties: false,
            required: ["responsive", "plugins"],
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description:
        "Send an email to a given recipient with a subject and message.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "The recipient email address.",
          },
          subject: {
            type: "string",
            description: "Email subject line.",
          },
          body: {
            type: "string",
            description: "Body of the email message.",
          },
        },
        required: ["to", "subject", "body"],
        additionalProperties: false,
      },
      // strict: true,
    },
  },
];

const assistant = await client.beta.assistants.create({
  model: "gpt-4o",
  // model: MODEL,
  instructions:
    "You are a data analyst. You will be given a dataset and you will need to extract insights from it. You will be given a list of tools that you can use to extract insights from the dataset. For each tool, you will be given a description of what the tool does and the input parameters. The input parameters will be a JSON object. You will then be asked to use the tool to answer a question. The question will be a natural language question. Your answer should be in JSON format. Please make sure to follow the format of the examples below. If you are unsure about the answer, please reply with the word 'UNSURE'.",
  tools: tools,
});

const examples = [
  "Give me a bar graph that shows the distribution of candidates based on their state and country.",
  // "Give me a bar graph that shows the distribution of candidates based on their state and country. Then send an email to test@test.com with the chart as an attachment.",
];

const thread = await client.beta.threads.create();
const message = client.beta.threads.messages.create(thread.id, {
  role: "user",
  content: examples[0],
});

const fetchCSV = () => {
  return {
    state: `Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Pampanga
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Victoria
  Queensland
  Queensland
  Queensland
  New South Wales
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  New South Wales
  Queensland
  Queensland
  North Carolina
  North Carolina
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  New South Wales
  Queensland
  Gauteng
  Gauteng
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Ho Chi Minh
  Queensland
  Gauteng
  Western Cape
  Gauteng
  Gauteng
  Ho Chi Minh
  Western Cape
  Western Cape
  Gauteng
  Gauteng
  Western Cape
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Queensland
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  KwaZulu-Natal
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Queensland
  Queensland
  
  Pahang
  Queensland
  
  
  Queensland
  Queensland
  
  
  Queensland
  
  Queensland
  Western Cape
  
  Queensland
  Queensland
  Western Cape
  Western Cape
  Western Cape
  
  Western Cape
  
  Queensland
  Gauteng
  
  Western Cape
  Western Cape
  Gauteng
  Queensland
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Queensland
  
  Queensland
  
  
  Queensland
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  
  
  Queensland
  Queensland
  
  
  Queensland
  Queensland
  Queensland
  
  
  Victoria
  
  
  
  
  
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Queensland
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  
  Western Cape
  Western Cape
  
  
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  KwaZulu-Natal
  Western Cape
  Western Cape
  Queensland
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Queensland
  Western Cape
  Queensland
  Queensland
  Western Cape
  
  Queensland
  
  Queensland
  Western Cape
  
  Queensland
  Queensland
  
  Queensland
  
  KwaZulu-Natal
  
  Queensland
  
  
  
  
  
  Queensland
  
  Queensland
  
  Queensland
  
  
  
  New South Wales
  
  
  
  
  
  
  
  
  
  
  Queensland
  Queensland
  
  Western Cape
  
  Queensland
  
  Queensland
  
  
  Queensland
  
  
  Queensland
  
  
  Queensland
  
  Queensland
  
  
  Queensland
  
  Queensland
  KwaZulu-Natal
  
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Ha Noi
  
  
  Queensland
  Queensland
  
  Queensland
  
  Queensland
  Queensland
  
  Queensland
  
  Queensland
  
  Queensland
  Queensland
  Queensland
  Other
  Other
  Lombardia
  
  Queensland
  
  Queensland
  Queensland
  Queensland
  
  Queensland
  Queensland
  Queensland
  
  Queensland
  Queensland
  Western Cape
  Queensland
  Queensland
  
  Western Cape
  Queensland
  Queensland
  Queensland
  
  Queensland
  Queensland
  
  
  Queensland
  Queensland
  
  Queensland
  Queensland
  Queensland
  Queensland
  
  Western Cape
  Queensland
  Queensland
  
  Galway
  Queensland
  Queensland
  Queensland
  
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Manawatu-Wanganui
  Manawatu-Wanganui
  Queensland
  
  New South Wales
  Queensland
  Queensland
  
  
  
  Queensland
  Western Cape
  Libertador General Bernardo O'Higgins
  Queensland
  Seoul-t'ukpyolsi
  Queensland
  Queensland
  Seoul-t'ukpyolsi
  Queensland
  Seoul-t'ukpyolsi
  
  
  Ho Chi Minh
  Queensland
  
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Suffolk
  Queensland
  Queensland
  Queensland
  Queensland
  
  Queensland
  Queensland
  Queensland
  Queensland
  
  
  Queensland
  
  Queensland
  Queensland
  
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  
  
  
  Queensland
  Gujarat
  Western Cape
  Dubai
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  
  Queensland
  Queensland
  
  Queensland
  
  
  
  
  Queensland
  Gauteng
  Queensland
  
  Queensland
  Queensland
  Ha Noi
  Ho Chi Minh
  Ho Chi Minh
  Cluj
  Andorra la Vella
  Laguna
  Yogyakarta
  Queensland
  Queensland
  Queensland
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Northern Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Northern Cape
  Western Cape
  Queensland
  Queensland
  Queensland
  
  Queensland
  Queensland
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Karnataka
  Western Cape
  Western Cape
  Queensland
  Western Cape
  Gauteng
  Kerala
  Cross River
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Northern Cape
  Western Cape
  Western Cape
  Eastern Cape
  Western Cape
  Western Cape
  Eastern Cape
  Western Cape
  Western Cape
  Free State
  Western Cape
  Eastern Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Northern Cape
  Western Cape
  KwaZulu-Natal
  KwaZulu-Natal
  Western Cape
  Mpumalanga
  Gauteng
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  North-West
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Eastern Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  KwaZulu-Natal
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Gauteng
  Gauteng
  Gauteng
  Gauteng
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  KwaZulu-Natal
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  Western Cape
  KwaZulu-Natal
  Western Cape
  Western Cape
  Western Cape
  New South Wales
  Queensland
  Queensland
  Queensland
  Queensland
  Brestskaya Voblasts'
  KwaZulu-Natal
  Western Cape
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Gujarat
  Nova Scotia
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Binh Thuan
  
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  New South Wales
  Queensland
  Queensland
  New South Wales
  Queensland
  New South Wales
  Queensland
  Queensland
  Queensland
  Sindh
  Queensland
  Khanh Hoa
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Manila
  Queensland
  Queensland
  Rizal
  Queensland
  Queensland
  Cavite
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Ha Noi
  Other
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Manila
  Manila
  Quezon City
  Manila
  Rizal
  Manila
  Eastern Cape
  Rizal
  Eastern Cape
  Khanh Hoa
  Ha Noi
  Other
  Manila
  Binh Thuan
  Iloilo City
  Cavite
  Pangasinan
  Dhaka
  Rizal
  Rizal
  Manila
  Rizal
  Other
  Manila
  Albay
  Bulacan
  La Union
  La Union
  Haryana
  New South Wales
  Wellington
  Laguna
  New South Wales
  Queensland
  New South Wales
  Queensland
  New South Wales
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Cavite
  Kerala
  Queensland
  Queensland
  New South Wales
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Manila
  Queensland
  Kerala
  Queensland
  Queensland
  Queensland
  Quezon City
  Queensland
  Queensland
  Queensland
  Queensland
  New South Wales
  Other
  Queensland
  Queensland
  Laguna
  Benguet
  Queensland
  Laguna
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Tokyo
  Queensland
  Queensland
  Victoria
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Unknown
  Isabela
  Queensland
  Davao del Sur
  Queensland
  Queensland
  Queensland
  Caloocan
  Queensland
  Cavite
  Manila
  Manila
  Manila
  Manila
  Rizal
  Manila
  Queensland
  Queensland
  Queensland
  New South Wales
  Queensland
  Queensland
  Queensland
  Other
  Auckland
  Queensland
  Queensland
  Kerala
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Manila
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Rizal
  Rizal
  Rizal
  Manila
  Manila
  Queensland
  Queensland
  Grad Zagreb
  Manila
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Victoria
  Queensland
  Manila
  Queensland
  Queensland
  Queensland
  Queensland
  New South Wales
  Queensland
  Victoria
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Andhra Pradesh
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Queensland
  Victoria
  Queensland
  Queensland
  Leyte
  Manila
  Manila
  Manila
  Manila
  Pasay
  Manila
  Queensland
  Queensland
  New South Wales
  Queensland
  Manila
  Manila
  Manila
  Rizal`,
    country: `AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  UNITED STATES
  UNITED STATES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  VIET NAM
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  VIET NAM
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  
  MALAYSIA
  AUSTRALIA
  
  
  AUSTRALIA
  AUSTRALIA
  
  
  AUSTRALIA
  
  AUSTRALIA
  SOUTH AFRICA
  
  AUSTRALIA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  
  SOUTH AFRICA
  
  AUSTRALIA
  SOUTH AFRICA
  
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  
  AUSTRALIA
  
  
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  
  
  AUSTRALIA
  AUSTRALIA
  
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  
  AUSTRALIA
  
  
  
  
  
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  
  SOUTH AFRICA
  SOUTH AFRICA
  
  
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  SOUTH AFRICA
  
  AUSTRALIA
  
  AUSTRALIA
  SOUTH AFRICA
  
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  
  SOUTH AFRICA
  
  AUSTRALIA
  
  
  
  
  
  AUSTRALIA
  
  AUSTRALIA
  
  AUSTRALIA
  
  
  
  AUSTRALIA
  
  
  
  
  
  
  
  
  
  
  AUSTRALIA
  AUSTRALIA
  
  SOUTH AFRICA
  
  AUSTRALIA
  
  AUSTRALIA
  
  
  AUSTRALIA
  
  
  AUSTRALIA
  
  
  AUSTRALIA
  
  AUSTRALIA
  
  
  AUSTRALIA
  
  AUSTRALIA
  SOUTH AFRICA
  
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  VIET NAM
  
  
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PAKISTAN
  PAKISTAN
  ITALY
  
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  
  
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  
  IRELAND
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  NEW ZEALAND
  NEW ZEALAND
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  
  
  AUSTRALIA
  SOUTH AFRICA
  CHILE
  AUSTRALIA
  KOREA, REPUBLIC OF
  AUSTRALIA
  AUSTRALIA
  KOREA, REPUBLIC OF
  AUSTRALIA
  KOREA, REPUBLIC OF
  
  
  VIET NAM
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  UNITED KINGDOM
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  
  
  AUSTRALIA
  INDIA
  SOUTH AFRICA
  UNITED ARAB EMIRATES
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  
  
  
  
  AUSTRALIA
  SOUTH AFRICA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  VIET NAM
  VIET NAM
  VIET NAM
  ROMANIA
  ANDORRA
  PHILIPPINES
  INDONESIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  
  AUSTRALIA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  INDIA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  SOUTH AFRICA
  SOUTH AFRICA
  INDIA
  NIGERIA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  BELARUS
  SOUTH AFRICA
  SOUTH AFRICA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  INDIA
  CANADA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  VIET NAM
  
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PAKISTAN
  AUSTRALIA
  VIET NAM
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  VIET NAM
  VENEZUELA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  SOUTH AFRICA
  PHILIPPINES
  SOUTH AFRICA
  VIET NAM
  VIET NAM
  VENEZUELA
  PHILIPPINES
  VIET NAM
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  BANGLADESH
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  INDIA
  AUSTRALIA
  NEW ZEALAND
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  INDIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  INDIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  INDIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  PHILIPPINES
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  JAPAN
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  Unknown
  PHILIPPINES
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  INDIA
  NEW ZEALAND
  AUSTRALIA
  AUSTRALIA
  INDIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  CROATIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  INDIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  AUSTRALIA
  PHILIPPINES
  PHILIPPINES
  PHILIPPINES`,
  };
};

const handleRequiresAction = async (run) => {
  // Check if there are tools that require outputs
  if (
    run.required_action &&
    run.required_action.submit_tool_outputs &&
    run.required_action.submit_tool_outputs.tool_calls
  ) {
    // Loop through each tool in the required action section
    const toolOutputs = run.required_action.submit_tool_outputs.tool_calls.map(
      (tool) => {
        if (tool.function.name === "getCSVData") {
          console.log("getCSVData");
          return {
            tool_call_id: tool.id,
            output: JSON.stringify(fetchCSV()),
          };
        } else if (tool.function.name === "build_chart_schema") {
          console.log("build_chart_schema");
          return {
            tool_call_id: tool.id,
            output: "Chart built successfully.",
          };
        } else if (tool.function.name === "send_email") {
          console.log("send_email");
          return {
            tool_call_id: tool.id,
            output: "Email sent successfully.",
          };
        }
      }
    );

    // Submit all tool outputs at once after collecting them in a list
    if (toolOutputs.length > 0) {
      run = await client.beta.threads.runs.submitToolOutputsAndPoll(
        thread.id,
        run.id,
        { tool_outputs: toolOutputs }
      );
      console.log("Tool outputs submitted successfully. \n");
    } else {
      console.log("No tool outputs to submit.");
    }

    // Check status after submitting tool outputs
    return handleRunStatus(run);
  }
};

const handleRunStatus = async (run) => {
  // Check if the run is completed
  if (run.status === "completed") {
    let messages = await client.beta.threads.messages.list(thread.id);
    // console.log(messages.data);
    console.log(messages.data[0].content);
    return messages.data;
  } else if (run.status === "requires_action") {
    console.log(run.status);
    return await handleRequiresAction(run);
  } else {
    console.error("Run did not complete:", run);
  }
};

// Create and poll run
let run = await client.beta.threads.runs.createAndPoll(thread.id, {
  assistant_id: assistant.id,
});

handleRunStatus(run);
