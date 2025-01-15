import express from "express";
import cors from "cors";
import {generate, getAllFiles, uploadFile} from "./utils";
import simpleGit from "simple-git";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const id = generate();
    await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

    const files = getAllFiles(path.join(__dirname, `output/${id}`));
    
    files.forEach(async file => {
        await uploadFile(file.slice(__dirname.length+1),file);
    })

    res.json({id: id});
});

app.listen(3000, () => console.log("Listening on port 3000"));