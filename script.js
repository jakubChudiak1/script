import fs from "fs";
import path from "path";
import https from "https";
import { parseString } from "xml2js";

const API_URL =
  "https://frkqbrydxwdp.compat.objectstorage.eu-frankfurt-1.oraclecloud.com/susr-rpo/";
let KEYS = [];
const FOLDER_PATH = process.argv[2];

const parseXML = (xmlData) => {
  parseString(xmlData, (err, result) => {
    if (err) {
      console.error("Error parsing XML:", err);
    }
    KEYS = result.ListBucketResult.Contents.map((content) => content.Key).flat(
      1
    );
  });
};

const fetchData = async () => {
  return new Promise((resolve, reject) => {
    https
      .get(API_URL, (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          parseXML(data);
          resolve();
        });
      })
      .on("error", (err) => {
        console.error("Error fetching data:", err);
        reject(err);
      });
  });
};

const downloadFiles = async (folderPath) => {
  const mainFolder = path.join(folderPath, "rpo_data");
  const initFolder = path.join(mainFolder, "inicializacne_davky");
  const batchFolder = path.join(mainFolder, "aktualizacne_davky");
  await fetchData();
  if (!fs.existsSync(mainFolder)) {
    fs.mkdirSync(mainFolder, { recursive: true });
  }
  if (!fs.existsSync(initFolder)) {
    fs.mkdirSync(initFolder, { recursive: true });
  }
  if (!fs.existsSync(batchFolder)) {
    fs.mkdirSync(batchFolder, { recursive: true });
  }
  KEYS.forEach((key) => {
    if (key.endsWith(".gz")) {
      const fileUrl = `${API_URL}${key}`;
      const fileName = path.basename(key);
      let filePath = "";
      if (key.startsWith("batch-init")) {
        filePath = path.join(initFolder, fileName);
      } else {
        filePath = path.join(batchFolder, fileName);
      }
      if (!fs.existsSync(filePath)) {
        const file = fs.createWriteStream(filePath);
        https
          .get(fileUrl, (response) => {
            response.pipe(file);
            file.on("finish", () => {
              file.close();
              console.log(`Downloaded ${fileName}`);
            });
          })
          .on("error", (err) => {
            fs.unlink(filePath, () => {});
            console.error(`Error downloading ${fileName}:`, err);
          });
      }
    }
  });
};

downloadFiles(FOLDER_PATH);
