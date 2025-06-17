const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const Redis = require("ioredis");

const client = new S3Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_KEY,
  },
});

const publisher = new Redis(process.env.REDIS_URL);

const PROJECT_ID = process.env.PROJECT_ID;

function publishLog(log) {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}

async function init() {
  // await producer.connect()

  console.log("Running index.js");

  publishLog("Build Started...");
  const outDirPath = path.join(__dirname, "output");

  const shell = exec(`cd ${outDirPath} && npm install && npm run build`);

  shell.stdout.on("data", function (data) {
    console.log("Success: ", data.toString());
    publishLog(data.toString());
  });

  shell.stdout.on("error", function (data) {
    console.log("Error: ", data.toString());
    publishLog(data.toString());
  });

  shell.on("close", async function () {
    console.log("Build Complete");

    publishLog("Build Complete...");
    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContent = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    publishLog("Upload Started...");
    for (const file of distFolderContent) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("Uploading: ", filePath);
      publishLog(`Uploading ${file}`);

      const command = new PutObjectCommand({
        Bucket: "deploycell",
        Key: `__output/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await client.send(command);
      console.log("Uploaded: ", filePath);
      publishLog(`Uploaded ${file}`);
    }

    publishLog("Processing Completed...");

    console.log("DONE......");
  });

  publishLog("DONE...");
}

init();
