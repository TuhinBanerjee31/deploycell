import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Button } from "./components/custom/button";
import { Input } from "./components/custom/input";
import { Github, Hammer, Package, Rocket } from "lucide-react";
import { ActionCard } from "./components/ActionCard";
import axios from "axios";

const socket = io(import.meta.env.VITE_SOCKET_URL);

export default function App() {
  const [repoURL, setURL] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [deployPreviewURL, setDeployPreviewURL] = useState<string | undefined>();
  const [deploymentComplete, setDeploymentComplete] = useState(false);

  const logContainerRef = useRef<HTMLElement>(null);

  const isValidURL: [boolean, string | null] = useMemo(() => {
    if (!repoURL || repoURL.trim() === "") return [false, null];
    const regex = new RegExp(
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/
    );
    return [regex.test(repoURL), "Enter valid Github Repository URL"];
  }, [repoURL]);

  const handleClickDeploy = useCallback(async () => {
    setLoading(true);
    setDeploymentComplete(false);

    const { data } = await axios.post(import.meta.env.VITE_BACKEND_URL, {
      gitURL: repoURL,
    });

    if (data && data.data) {
      const { projectSlug, url } = data.data;
      setProjectId(projectSlug);
      setDeployPreviewURL(url);

      console.log(`Subscribing to logs:${projectSlug}`);
      socket.emit("subscribe", `logs:${projectSlug}`);
    }
  }, [projectId, repoURL]);

  const handleClearDeployment = useCallback(() => {
    setURL("");
    setLogs([]);
    setLoading(false);
    setProjectId(undefined);
    setDeployPreviewURL(undefined);
    setDeploymentComplete(false);
  }, []);

  const handleSocketIncommingMessage = useCallback((message: string) => {
    console.log(`[Incomming Socket Message]:`, typeof message, message);
    const { log } = JSON.parse(message);
    setLogs((prev) => [...prev, log]);
    logContainerRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Check if deployment is complete
    if (log.includes("Deployment completed") || log.includes("Build completed") || log.includes("✓")) {
      setLoading(false);
      setDeploymentComplete(true);
    }
  }, []);

  useEffect(() => {
    socket.on("message", handleSocketIncommingMessage);

    return () => {
      socket.off("message", handleSocketIncommingMessage);
    };
  }, [handleSocketIncommingMessage]);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
      <style jsx>{`
        @keyframes scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/5 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]"></div>
      
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 border-b border-green-500/20">
        <div className="flex items-center space-x-2">
          <div className="text-green-400 text-xl font-bold tracking-wider">
            DEPLOYCELL
          </div>
        </div>
        <div className="text-green-600/60 text-sm">
          20/06/2025 | CHANNEL 01
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-6">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Title Section */}
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-bold text-green-400 tracking-wider">
              DEPLOYCELL
            </h1>
            <p className="text-green-600/80 text-lg font-mono">
              {"<> Build It_"}
            </p>
          </div>

          {/* Deploy Section */}
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-black/40 border border-green-500/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="text-green-400 font-mono text-sm">
                  $ deploycell init
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-green-600/80 text-sm shrink-0">&gt;</span>
                  <Input
                    disabled={loading}
                    value={repoURL}
                    onChange={(e) => setURL(e.target.value)}
                    type="url"
                    placeholder="Enter your repository URL or project name..."
                    className="flex-1"
                  />
                </div>

                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={handleClickDeploy}
                    disabled={!isValidURL[0] || loading}
                    variant="terminal"
                    className="px-8 py-3 text-sm tracking-wider"
                  >
                    {loading ? "⚡ DEPLOYING" : "⚡ DEPLOY"}
                  </Button>
                  
                  {(deployPreviewURL || logs.length > 0) && (
                    <Button
                      onClick={handleClearDeployment}
                      disabled={loading}
                      variant="outline"
                      className="px-6 py-3 text-sm tracking-wider"
                    >
                      NEW DEPLOYMENT
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Deploy Preview URL */}
            {deployPreviewURL && (
              <div className="bg-black/60 border border-green-500/40 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-600/80 text-sm">Preview URL:</span>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 underline font-mono text-sm"
                    href={deployPreviewURL}
                  >
                    {deployPreviewURL}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <ActionCard
              icon={Hammer}
              title="BUILD IT"
              description="Automate the build process from your repository"
              active={loading}
              scaling={loading && !deploymentComplete}
              animationDelay={0}
            />
            <ActionCard
              icon={Package}
              title="SHIP IT"
              description="Deploy with seamless CI/CD integration"
              scaling={loading && !deploymentComplete}
              animationDelay={0.7}
            />
            <ActionCard
              icon={Rocket}
              title="LAUNCH IT"
              description="Deploy to global edge network"
              scaling={loading && !deploymentComplete}
              animationDelay={1.4}
            />
          </div>

          {/* Logs Section */}
          {logs.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-black/60 border border-green-500/40 rounded-lg backdrop-blur-sm">
                <div className="border-b border-green-500/20 p-4">
                  <h3 className="text-green-400 font-mono text-sm">Deployment Logs</h3>
                </div>
                <div className="p-4 h-[300px] overflow-y-auto">
                  <pre className="text-green-400 text-xs space-y-1">
                    {logs.map((log, i) => (
                      <code
                        ref={logs.length - 1 === i ? logContainerRef : undefined}
                        key={i}
                        className="block"
                      >
                        {`> ${log}`}
                      </code>
                    ))}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center p-6 border-t border-green-500/20">
        <div className="text-green-600/60 text-xs font-mono">
          DEPLOYCELL v2.0.0 | Build It - Ship It - Launch It
        </div>
      </footer>
    </div>
  );
}
