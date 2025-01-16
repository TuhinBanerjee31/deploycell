import express from "express";
import cors from "cors";
import {generate, getAllFiles, uploadFile} from "./utils";
import simpleGit from "simple-git";
import path from "path";
import { createClient } from "redis";;

const publisher = createClient();
publisher.connect();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const id = generate();
    await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

    const files = getAllFiles(path.join(__dirname, `output/${id}`));
    
    files.forEach(async file => {
        await uploadFile(file.slice(__dirname.length + 1),file);
    })

    publisher.lPush("build-queue", id);
    publisher.hSet("status", id, "uploaded");

    res.json({id: id});
});

// app.get("/status",  async (req,res) => {
//     const id = req.query.id;
//     const response = await subscriber.hGet("status", id as string);

//     res.json({status: response});
// })

app.listen(3000, () => console.log("Listening on port 3000"));