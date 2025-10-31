"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import CryptoJS from "crypto-js";

export default function AdminPage() {
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);

  // 🔒 Chave secreta usada na criptografia
  const secretKey = "amigo-x-secret";

  // ➕ Adiciona um nome
  const handleAdd = () => {
    if (name.trim() && !participants.includes(name.trim())) {
      setParticipants((prev) => [...prev, name.trim()]);
      setName("");
    }
  };

  // 💾 Gera e baixa o JSON
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

  // 📂 Carrega um arquivo JSON existente
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

  // ❌ Remove um participante
  const handleRemove = (name: string) => {
    setParticipants((prev) => prev.filter((n) => n !== name));
  };

  // 🔀 Função de sorteio determinístico (mesma entrada → mesmo resultado)
  const handleDraw = async () => {
    if (participants.length < 2) {
      alert("É necessário pelo menos 2 participantes para o sorteio.");
      return;
    }

    // Cria uma semente com base na lista (garante resultado fixo)
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
    let shuffled = [...participants];
    let valid = false;
    let attempts = 0;

    // Embaralhamento determinístico (Fisher-Yates)
    const deterministicShuffle = (array: string[]) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // Garante que ninguém tire a si mesmo
    while (!valid && attempts < 1000) {
      shuffled = deterministicShuffle(participants);
      valid = shuffled.every((p, i) => p !== participants[i]);
      attempts++;
    }

    if (!valid) {
      alert("Não foi possível gerar um sorteio válido.");
      return;
    }

    // Gera PDFs individuais
    for (let i = 0; i < participants.length; i++) {
      const giver = participants[i];
      const receiver = shuffled[i];

      // Criptografa o nome do sorteado
      const encrypted = CryptoJS.AES.encrypt(receiver, secretKey).toString();

      await generatePDF(giver, encrypted);
    }

    alert("🎉 Sorteio realizado! PDFs individuais foram baixados.");
  };

  // 📄 Gera o PDF com nome + sorteado criptografado
  const generatePDF = async (name: string, encryptedName: string) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 250]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const titleSize = 18;
    const textSize = 14;

    // Fundo suave
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.96, 0.97, 1),
    });

    // Título (sem emoji — evita erro de codificação)
    page.drawText("Amigo X", {
      x: 150,
      y: height - 50,
      size: titleSize,
      font,
      color: rgb(0.2, 0.2, 0.4),
    });

    // Nome do participante
    page.drawText(`Participante: ${name}`, {
      x: 40,
      y: height - 100,
      size: textSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Código do sorteado (criptografado)
    page.drawText("Código do sorteado:", {
      x: 40,
      y: height - 140,
      size: textSize,
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
    const blob = new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}_sorteio.pdf`;
    a.click();
    URL.revokeObjectURL(url);
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
