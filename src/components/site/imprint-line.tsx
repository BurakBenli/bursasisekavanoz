import { cacheLife } from "next/cache";

// Künye satırı (SPEC 5). MERSİS ve sicil Ayarlar'a taşınana kadar yer tutucu.
const MERSIS_NUMBER = "[DOLDURULACAK: MERSİS numarası]";
const TRADE_REGISTRY_NUMBER = "[DOLDURULACAK: ticaret sicil numarası]";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function ImprintLine() {
  const year = await currentYear();
  return (
    <p>
      © {year} Bursa Şişe Kavanoz A.Ş. · MERSİS {MERSIS_NUMBER} · Ticaret sicil {TRADE_REGISTRY_NUMBER}
    </p>
  );
}
