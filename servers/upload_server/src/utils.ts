import fs from "fs";
import path from "path";
import {S3} from "aws-sdk";
import 'dotenv/config'

const generate = () => {
  const subset = "123456789qwertyuiopasdfghjklzxcvbnm";
  const length = 5;
  let id = "";

  for (let i = 0; i < length; i++) {
    id += subset[Math.floor(Math.random() * subset.length)];
  }

  return id;
};

const getAllFiles = (folderPath: string) => {
  let response: string[] = [];

  const allFilesAndFolders = fs.readdirSync(folderPath);
  allFilesAndFolders.forEach((file) => {
    const fullFilePath = path.join(folderPath, file);

    if (fs.statSync(fullFilePath).isDirectory()) {
      response = response.concat(getAllFiles(fullFilePath));
    } else {
      response.push(fullFilePath);
    }
  });

  return response;
};

const s3 = new S3({
  accessKeyId: process.env.R2_KEYID,
  secretAccessKey: process.env.R2_SECERT,
  endpoint: process.env.R2_ENDPOINT
})

const uploadFile = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const response = await s3.upload({
    Body: fileContent,
    Bucket: "deploycell",
    Key: fileName,
  }).promise();

  console.log(response);
}

export { generate, getAllFiles, uploadFile };
