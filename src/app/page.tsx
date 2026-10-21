import Image from "next/image";
import Link from "next/link";
import { ImprintLine } from "@/components/site/imprint-line";
import logo from "../../public/logo-gecici.png";

// Faz 1 geçici sayfası. Gerçek ana sayfa Faz 6'da (SPEC 6.1, Anasayfa*.html).
export default function HomePage() {
  const showStyleGuide = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-brand-dark text-[13px] text-white">
        <p className="content-wrap py-2">1995&apos;ten beri Bursa&apos;da · Toptan ve perakende ambalaj</p>
      </div>

      <header className="border-b border-card-line bg-card">
        <div className="content-wrap flex items-center gap-3 py-4">
          <Image src={logo} alt="" width={48} height={48} priority />
          <div className="leading-tight">
            <p className="text-lg font-bold text-brand-dark">Bursa Şişe Kavanoz</p>
            <p className="text-[13px] text-muted">Şişe · Kavanoz · Kapak</p>
          </div>
        </div>
      </header>

      <main className="content-wrap flex flex-1 flex-col justify-center py-16 tablet:py-24">
        <p className="text-[12.5px] font-semibold tracking-[0.04em] text-caption uppercase">
          Yeni site hazırlanıyor
        </p>
        <h1 className="mt-3 max-w-3xl text-2xl font-bold text-ink desktop:text-[34px] desktop:leading-tight">
          Şişe, kavanoz ve kapakta aradığınızı ölçüsüyle bulun
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Hacim, ağız çapı ve malzemeye göre filtreleyin; adede göre fiyatları görün, tek formla teklif alın.
          Üyelik gerekmez.
        </p>
        {showStyleGuide && (
          <p className="mt-8">
            <Link
              href="/stil-rehberi"
              className="inline-flex min-h-11 items-center rounded-control border-[1.5px] border-brand bg-white px-5 font-semibold text-brand"
            >
              Stil rehberi
            </Link>
          </p>
        )}
      </main>

      <footer className="bg-brand-dark py-6 text-[13px] text-white/85">
        <div className="content-wrap">
          <ImprintLine />
        </div>
      </footer>
    </div>
  );
}
