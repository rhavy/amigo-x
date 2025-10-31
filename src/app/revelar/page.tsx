"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import CryptoJS from "crypto-js";

export default function RevelarPage() {
  const [encrypted, setEncrypted] = useState("");
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const secretKey = "amigo-x-secret"; // mesma chave usada no sorteio

  const handleDecrypt = () => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted.trim(), secretKey);
      const original = bytes.toString(CryptoJS.enc.Utf8);

      if (!original) {
        setDecrypted("⚠️ Código inválido ou corrompido!");
      } else {
        setDecrypted(`🎉 Seu amigo secreto é: ${original}`);
      }
    } catch (error) {
      setDecrypted("❌ Erro ao decodificar o código!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <Card className="w-full max-w-md shadow-lg border border-slate-200">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            🔍 Revelar Amigo-X
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="code">Cole o código do seu PDF</Label>
            <Input
              id="code"
              placeholder="Insira o código criptografado"
              value={encrypted}
              onChange={(e) => setEncrypted(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDecrypt()}
              className="mt-2"
            />
          </div>

          <Button className="w-full" onClick={handleDecrypt}>
            🔓 Revelar
          </Button>

          {decrypted && (
            <div className="text-center mt-4 text-lg font-medium text-slate-700">
              {decrypted}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
