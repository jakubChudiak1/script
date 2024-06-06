import fs from "fs";
import path from "path";
import https from "https";
import { parseString } from "xml2js";

const API_URL =
  "https://frkqbrydxwdp.compat.objectstorage.eu-frankfurt-1.oraclecloud.com/susr-rpo/";
let KEYS = [];
const FOLDER_PATH = "C:/";
const MAIN_FOLDER = path.join(FOLDER_PATH, "rpo_data");
const INIT_FOLDER = path.join(MAIN_FOLDER, "inicializacne_davky");
const BATCH_FOLDER = path.join(FOLDER_PATH, "aktualizacne_davky");

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

const downloadFiles = async () => {
  await fetchData();
  if (!fs.existsSync(MAIN_FOLDER)) {
    fs.mkdirSync(MAIN_FOLDER, { recursive: true });
  }
  if (!fs.existsSync(INIT_FOLDER)) {
    fs.mkdirSync(INIT_FOLDER, { recursive: true });
  }
  if (!fs.existsSync(BATCH_FOLDER)) {
    fs.mkdirSync(BATCH_FOLDER, { recursive: true });
  }
  KEYS.forEach((key) => {
    if (key.endsWith(".gz")) {
      const fileUrl = `${API_URL}${key}`;
      const fileName = path.basename(key);
      let filePath = "";
      if (key.startsWith("batch-init")) {
        filePath = path.join(INIT_FOLDER, fileName);
      } else {
        filePath = path.join(BATCH_FOLDER, fileName);
      }
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
  });
};

downloadFiles();
