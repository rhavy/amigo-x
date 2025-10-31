"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import CryptoJS from "crypto-js";
import JSZip from "jszip";

export default function AdminPage() {
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);

  const secretKey = "amigo-x-secret";

  const handleAdd = () => {
    if (name.trim() && !participants.includes(name.trim())) {
      setParticipants((prev) => [...prev, name.trim()]);
      setName("");
    }
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(participants, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participantes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          setParticipants(json);
          setLoadedFileName(file.name);
        } else {
          alert("Arquivo inválido: deve ser um array JSON de nomes.");
        }
      } catch {
        alert("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleRemove = (name: string) => {
    setParticipants((prev) => prev.filter((n) => n !== name));
  };

  // Função para gerar PDF em memória e retornar Uint8Array
  const generatePDFBytes = async (name: string, encryptedName: string) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 250]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.96, 0.97, 1),
    });

    page.drawText("Amigo X", {
      x: 150,
      y: height - 50,
      size: 18,
      font,
      color: rgb(0.2, 0.2, 0.4),
    });

    page.drawText(`Participante: ${name}`, {
      x: 40,
      y: height - 100,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText("Código do sorteado:", {
      x: 40,
      y: height - 140,
      size: 14,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(encryptedName, {
      x: 40,
      y: height - 160,
      size: 10,
      font,
      color: rgb(0.4, 0.1, 0.1),
    });

    const pdfBytes = await pdfDoc.save();
    return new Uint8Array(pdfBytes);
  };

  const handleDraw = async () => {
    if (participants.length < 2) {
      alert("É necessário pelo menos 2 participantes para o sorteio.");
      return;
    }

    // Semente determinística
    const seed = CryptoJS.SHA256(JSON.stringify(participants)).toString();
    const seededRandom = (seed: string) => {
      let h = 0;
      for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) % 0xffffffff;
      }
      return () => {
        h = (h * 1664525 + 1013904223) % 0xffffffff;
        return h / 0xffffffff;
      };
    };
    const rand = seededRandom(seed);

    const deterministicShuffle = (array: string[]) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    let shuffled = [...participants];
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 1000) {
      shuffled = deterministicShuffle(participants);
      valid = shuffled.every((p, i) => p !== participants[i]);
      attempts++;
    }

    if (!valid) {
      alert("Não foi possível gerar um sorteio válido.");
      return;
    }

    // Cria ZIP
    const zip = new JSZip();

    for (let i = 0; i < participants.length; i++) {
      const giver = participants[i];
      const receiver = shuffled[i];
      const encrypted = CryptoJS.AES.encrypt(receiver, secretKey).toString();

      const pdfBytes = await generatePDFBytes(giver, encrypted);
      zip.file(`${giver}_sorteio.pdf`, pdfBytes);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sorteio_amigo-x.zip";
    a.click();
    URL.revokeObjectURL(url);

    alert("🎉 Sorteio realizado! Todos os PDFs foram baixados em um único ZIP.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <Card className="w-full max-w-lg shadow-lg border border-slate-200">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            🎁 Painel do Administrador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input para adicionar nomes */}
          <div>
            <Label htmlFor="name">Adicionar Participante</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="name"
                placeholder="Digite o nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button onClick={handleAdd}>Adicionar</Button>
            </div>
          </div>

          {/* Lista de participantes */}
          {participants.length > 0 && (
            <div className="max-h-64 overflow-y-auto border rounded-md p-2 bg-white">
              {participants.map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center border-b last:border-none py-1"
                >
                  <span>{p}</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove(p)}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <Button
              className="flex-1"
              onClick={handleDownloadJSON}
              disabled={participants.length === 0}
            >
              💾 Baixar JSON
            </Button>

            <div className="flex-1">
              <Label
                htmlFor="file"
                className="cursor-pointer flex items-center justify-center px-4 py-2 border rounded-md bg-white hover:bg-slate-50 transition"
              >
                📂 Carregar JSON
              </Label>
              <input
                type="file"
                id="file"
                accept="application/json"
                onChange={handleLoadFile}
                className="hidden"
              />
            </div>
          </div>

          {/* Botão de sorteio */}
          <Button
            className="w-full mt-4 bg-green-600 hover:bg-green-700"
            onClick={handleDraw}
            disabled={participants.length < 2}
          >
            🎲 Realizar Sorteio e Gerar PDFs
          </Button>

          {loadedFileName && (
            <p className="text-sm text-center text-slate-500">
              Arquivo carregado: <b>{loadedFileName}</b>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
