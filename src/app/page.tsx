import Image from "next/image";
import Link from "next/link";

const customerBenefits = [
  {
    audience: "Eier",
    title: "Nysgjerrig på batteriet?",
    text: "Følg hvordan rekkevidde og batteridata utvikler seg. Et brått skifte er et signal om å sjekke videre, før garantien går ut.",
    detail: "Utvikling, ikke ett tall",
    icon: "battery",
  },
  {
    audience: "Selger",
    title: "Skal du selge?",
    text: "Batteriets tilstand veier tungt for prisen. Vis en ryddig historikk med dataperiode, og vær ærlig om det som ikke er målt.",
    detail: "Dokumentasjon til annonsen",
    icon: "report",
  },
  {
    audience: "Kjøper",
    title: "Vurderer du å kjøpe?",
    text: "Se hva som er registrert over tid før du stoler på rekkevidden i annonsen. Historikk erstatter ikke en uavhengig batterikontroll.",
    detail: "Fakta før beslutning",
    icon: "inspect",
  },
] as const;

const offers = [
  {
    name: "Giret Historikk",
    price: "1 000 kr",
    cadence: "per år",
    text: "Følg batterinivå, rekkevidde og lading mens du eier bilen. Historikken viser om noe endrer seg, og når det er verdt en faglig kontroll.",
    points: [
      "Tilgjengelige bildata samles løpende",
      "Utvikling over tid, ikke ett øyeblikk",
      "Du styrer hva som deles",
    ],
    href: "#historikk",
    cta: "Slik fungerer historikken",
  },
  {
    name: "Giret Salgsrapport",
    price: "400 kr",
    cadence: "engangssum",
    text: "En delbar rapport når bilen skal selges eller vurderes. Tydelig på periode, målinger og hull.",
    points: [
      "Klar til annonsen eller visning",
      "Kjøper ser bare det du deler",
      "Supplement til uavhengig batterikontroll",
    ],
    href: "#rapport",
    cta: "Se eksempelrapporten",
  },
] as const;

const reportRows = [
  ["Tilkoblet periode", "18 måneder"],
  ["Registrerte målinger", "12 840"],
  ["Siste oppdatering", "I dag, 08:42"],
];

const steps = [
  {
    number: "1",
    title: "Koble til mens du eier",
    text: "Gi Giret lesetilgang gjennom en sikker innlogging hos bilens leverandør.",
  },
  {
    number: "2",
    title: "Bygg historikk over tid",
    text: "Verdiene bilen deler samles med dataperiode, kilde og tydelige hull.",
  },
  {
    number: "3",
    title: "Del når det gjelder",
    text: "Bruk innsikten selv, eller del en forståelig rapport når bilen skal vurderes eller selges.",
  },
];

const questions = [
  {
    question: "Hva koster Giret?",
    answer:
      "Historikk koster 1 000 kroner i året. Salgsrapporten koster 400 kroner som engangssum. Dette er pilotpriser mens vi tester med de første bileierne.",
  },
  {
    question: "Hva er batterihelse?",
    answer:
      "Batterihelse, ofte kalt SoH, er hvor mye av den opprinnelige kapasiteten som fortsatt er tilgjengelig, målt mot da bilen var ny. Det er dette en uavhengig batterikontroll svarer på, gjerne som et tall fra 0 til 100. Giret måler ikke SoH. Vi viser utviklingen i data bilen deler, som batterinivå, estimert rekkevidde og lading.",
  },
  {
    question: "Betyr dårligere rekkevidde at batteriet er dårlig?",
    answer:
      "Ikke automatisk. Rekkevidde påvirkes av årstid, kjørestil, last og temperatur. Et svakt tall én uke kan være kaldt vær. Et varig fall, eller at bilen presterer dårligere enn forventet innenfor garantitiden, er et signal om å ta en batterikontroll. Den kan også avdekke avvik i enkeltceller, som Giret ikke kan se.",
  },
  {
    question: "Er Giret det samme som en batterikontroll?",
    answer:
      "Nei. En batterikontroll på verksted gir et øyeblikksbilde av restkapasitet og kan fange opp sjeldne cellefeil, ofte viktig før kjøp, salg eller garantiutløp. Det finnes ingen felles godkjent standard for slike tester. Giret er historikken før og etter testen: hva bilen har registrert over tid, og hva som mangler.",
  },
  {
    question: "Må jeg ha abonnement for å kjøpe salgsrapport?",
    answer:
      "Nei. Rapporten kan kjøpes alene. Den viser bare den perioden som faktisk finnes. Kobler du til like før salg, blir grunnlaget kort. Derfor er historikk og rapport best sammen.",
  },
  {
    question: "Hva får en interessert kjøper se?",
    answer:
      "Bare rapporten du velger å dele. Den viser registrerte målinger, dataperiode og eventuelle hull. Kjøperen får verken live-tilgang til bilen eller mulighet til å styre den.",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m4 10 3.5 3.5L16 5.5" />
    </svg>
  );
}

function BenefitIcon({ name }: { name: (typeof customerBenefits)[number]["icon"] }) {
  if (name === "battery") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect height="12" rx="2" width="16" x="3" y="7" />
        <path d="M19 10h2v4h-2M8 11v4M12 11v4" />
      </svg>
    );
  }

  if (name === "report") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 4h8l4 4v12H7z" />
        <path d="M15 4v4h4M9 12h6M9 16h4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function GiretLogo() {
  return (
    <span className="landing-wordmark">
      <span aria-hidden="true" className="landing-logo-mark">
        <span />
      </span>
      Giret
    </span>
  );
}

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="landing-header">
        <div className="landing-shell landing-nav">
          <Link aria-label="Giret, forsiden" href="/">
            <GiretLogo />
          </Link>
          <nav aria-label="Hovedmeny">
            <a href="#tjenester">Tjenester</a>
            <a href="#historikk">Batteriet</a>
            <a href="#rapport">Salgsrapport</a>
            <a href="#sporsmal">Spørsmål</a>
          </nav>
          <a className="landing-nav-cta" href="/login">
            Logg inn
            <ArrowIcon />
          </a>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-shell landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-kicker">
              <span />
              Innsikt før, under og etter bilholdet
            </p>
            <h1>
              Tryggere kjøp.
              <br />
              <em>Tryggere salg.</em>
            </h1>
            <p className="landing-hero-lead">
              De fleste som kjøper brukt elbil lurer på batteriet. Giret gjør
              data om rekkevidde og lading til en historikk du kan følge mens
              du eier, og dele når bilen skal vurderes.
            </p>
            <div className="landing-actions">
              <a className="landing-button landing-button-primary" href="#tjenester">
                Se tjenestene
                <ArrowIcon />
              </a>
              <a className="landing-button landing-button-secondary" href="#rapport">
                Se eksempelrapporten
              </a>
            </div>
            <div className="landing-trust-line" aria-label="Produktprinsipper">
              <span>
                <CheckIcon />
                Kun lesetilgang
              </span>
              <span>
                <CheckIcon />
                Tydelig på hva som er målt
              </span>
              <span>
                <CheckIcon />
                Du bestemmer hva som deles
              </span>
            </div>
          </div>

          <div className="landing-hero-media">
            <Image
              alt="En moderne elbil på en norsk fjordvei"
              className="landing-hero-image"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 54vw"
              src="/images/giret-hero.png"
            />
            <div className="landing-image-shade" />
            <div className="landing-live-chip">
              <span />
              Historikken oppdateres
            </div>
            <div className="landing-vehicle-glance">
              <div className="landing-glance-topline">
                <span>Eksempel fra bilen</span>
                <span>Siste 30 dager</span>
              </div>
              <div className="landing-glance-main">
                <div>
                  <span>Estimert rekkevidde</span>
                  <strong>
                    328 <small>km</small>
                  </strong>
                </div>
                <div className="landing-glance-level">
                  <span>Batterinivå</span>
                  <div
                    className="landing-battery-ring"
                    aria-label="78 prosent batterinivå, ikke batterihelse"
                  >
                    <span>78%</span>
                  </div>
                </div>
              </div>
              <div className="landing-glance-meta">
                <span>
                  <i className="landing-dot landing-dot-lime" />
                  42 registrerte målinger
                </span>
                <span>Trend: stabil</span>
              </div>
            </div>
          </div>
        </div>
        <div className="landing-shell landing-proof-strip">
          <span>Historikk · 1 000 kr / år</span>
          <span>Salgsrapport · 400 kr</span>
          <span>Kun lesetilgang til bilen</span>
        </div>
      </section>

      <section className="landing-section landing-intro" id="produkt">
        <div className="landing-shell">
          <div className="landing-section-heading">
            <p className="landing-overline">For eier, selger og kjøper</p>
            <h2>Fra «jeg tror» til «dette vet vi om bilen».</h2>
            <p>
              Usikkerhet om batteriet gjør bruktbilhandel vanskelig. Giret
              skiller historikk du kan følge, fra batterihelse som måles i en
              uavhengig kontroll før kjøp, salg eller garantiutløp.
            </p>
          </div>
          <div className="landing-benefit-grid">
            {customerBenefits.map((benefit) => (
              <article className="landing-benefit-card" key={benefit.audience}>
                <span className="landing-card-icon" aria-hidden="true">
                  <BenefitIcon name={benefit.icon} />
                </span>
                <span className="landing-card-audience">{benefit.audience}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
                <small>{benefit.detail}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-offers" id="tjenester">
        <div className="landing-shell">
          <div className="landing-section-heading">
            <p className="landing-overline">To tjenester</p>
            <h2>Følg bilen gjennom året. Dokumenter den når den skal selges.</h2>
            <p>
              Historikk er abonnementet. Salgsrapporten er engangskjøpet.
              De kan brukes hver for seg, men gir mer sammen.
            </p>
          </div>
          <div className="landing-offer-grid">
            {offers.map((offer) => (
              <article className="landing-offer-card" key={offer.name}>
                <div className="landing-offer-top">
                  <p className="landing-overline">{offer.name}</p>
                  <p className="landing-offer-price">
                    <strong>{offer.price}</strong>
                    <span>{offer.cadence}</span>
                  </p>
                </div>
                <p>{offer.text}</p>
                <ul>
                  {offer.points.map((point) => (
                    <li key={point}>
                      <CheckIcon />
                      {point}
                    </li>
                  ))}
                </ul>
                <a className="landing-offer-link" href={offer.href}>
                  {offer.cta}
                  <ArrowIcon />
                </a>
              </article>
            ))}
          </div>
          <p className="landing-offer-note">
            Pilotpriser · kan justeres når flere biler er med
          </p>
        </div>
      </section>

      <section className="landing-product-section" id="historikk">
        <div className="landing-shell landing-product-grid">
          <div className="landing-product-copy">
            <p className="landing-overline landing-overline-light">
              Historikk · 1 000 kr / år
            </p>
            <h2>Dårligere rekkevidde betyr ikke automatisk dårligere batteri.</h2>
            <p>
              Rekkevidde påvirkes av årstid, kjørestil og temperatur. Batterihelse
              er noe annet: hvor mye av den opprinnelige kapasiteten som er
              igjen. Giret viser utviklingen i tallene bilen deler, så du ser
              om det er et mønster, eller bare en kald uke.
            </p>
            <ul className="landing-check-list">
              <li>
                <CheckIcon />
                Følg batterinivå og estimert rekkevidde over tid
              </li>
              <li>
                <CheckIcon />
                Se om endringen er et mønster, eller et øyeblikksbilde
              </li>
              <li>
                <CheckIcon />
                Få grunnlag for batterikontroll før garantiutløp
              </li>
            </ul>
          </div>

          <div className="landing-dashboard" aria-label="Eksempel på Giret-oversikt">
            <div className="landing-dashboard-bar">
              <GiretLogo />
              <span>Min bil</span>
              <span className="landing-avatar">MR</span>
            </div>
            <div className="landing-dashboard-body">
              <div className="landing-dashboard-title">
                <div>
                  <span>Bilens utvikling</span>
                  <strong>Dette har bilen registrert.</strong>
                </div>
                <span className="landing-updated">Oppdatert 08:42</span>
              </div>
              <div className="landing-dashboard-cards">
                <div className="landing-dashboard-card landing-dashboard-battery">
                  <span>Batterinivå</span>
                  <strong>78%</strong>
                  <div className="landing-charge-track">
                    <span />
                  </div>
                  <small>Estimert 328 km tilgjengelig</small>
                </div>
                <div className="landing-dashboard-card landing-dashboard-range">
                  <div>
                    <span>Rekkevidde · 30 dager</span>
                    <strong>Stabil utvikling</strong>
                  </div>
                  <svg aria-hidden="true" viewBox="0 0 260 92">
                    <defs>
                      <linearGradient id="rangeFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#c48a4a" stopOpacity=".28" />
                        <stop offset="1" stopColor="#c48a4a" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      className="landing-chart-area"
                      d="M2 70 C26 66 36 54 58 58 S91 70 112 51 S149 35 169 43 S207 56 258 20 V92 H2 Z"
                    />
                    <path
                      className="landing-chart-line"
                      d="M2 70 C26 66 36 54 58 58 S91 70 112 51 S149 35 169 43 S207 56 258 20"
                    />
                    <circle cx="258" cy="20" r="4" />
                  </svg>
                </div>
              </div>
              <div className="landing-insight-row">
                <div className="landing-insight-icon">↗</div>
                <div>
                  <span>Ny innsikt</span>
                  <strong>Estimert rekkevidde har vært stabil i 30 dager.</strong>
                </div>
                <span className="landing-insight-link">Se utvikling</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-story-section">
        <div className="landing-shell landing-story-grid">
          <div className="landing-story-media">
            <Image
              alt="Elbil som lader ved et norsk trehus"
              fill
              sizes="(max-width: 800px) 100vw, 52vw"
              src="/images/giret-charging.png"
            />
            <div className="landing-session-card">
              <span>Siste registrerte lading</span>
              <strong>42 → 78%</strong>
              <small>36 prosentpoeng · hjemme</small>
            </div>
          </div>
          <div className="landing-story-copy">
            <p className="landing-overline">Mens du eier bilen</p>
            <h2>Den beste dokumentasjonen starter før salgsannonsen.</h2>
            <p>
              De fleste sjekker batteriet for sent: like før salg, eller når
              garantien allerede er ute. Kobler du til tidlig, bygger bilen
              selv et sammenligningsgrunnlag du kan bruke før kontroll, kjøp
              eller salg.
            </p>
            <div className="landing-mini-features">
              <div>
                <span>01</span>
                <p>
                  <strong>Følg utviklingen</strong>
                  Oppdag endringer tidlig, mens en eventuell garanti fortsatt
                  kan gjelde.
                </p>
              </div>
              <div>
                <span>02</span>
                <p>
                  <strong>Stå bedre forberedt</strong>
                  Ha historikken klar før kjøp, salg eller garantiutløp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-report-section" id="rapport">
        <div className="landing-shell landing-report-grid">
          <div className="landing-report-copy">
            <p className="landing-overline">Salgsrapport · 400 kr</p>
            <h2>Trygghet skapes av det som kan vises.</h2>
            <p>
              Batteriets tilstand er ofte det som avgjør prisen. Selgeren får
              historikk som styrker annonsen. Kjøperen får et bedre grunnlag
              for å stille spørsmål, og for å avtale en uavhengig
              batterikontroll før kontrakten signeres.
            </p>
            <div className="landing-audience-notes">
              <div>
                <span>For selger</span>
                <strong>Vis det du vet, og vær tydelig på resten.</strong>
              </div>
              <div>
                <span>For kjøper</span>
                <strong>Still bedre spørsmål før du bestemmer deg.</strong>
              </div>
            </div>
            <div className="landing-report-points">
              <span>
                <CheckIcon />
                Målinger med tydelig dataperiode
              </span>
              <span>
                <CheckIcon />
                Synlige hull og estimater
              </span>
              <span>
                <CheckIcon />
                Delbar visning for interessenter
              </span>
            </div>
          </div>

          <div className="landing-report-visual">
            <div className="landing-report-paper">
              <div className="landing-report-header">
                <GiretLogo />
                <span>Eksempelrapport</span>
              </div>
              <div className="landing-report-car">
                <span>Elektrisk SUV · 2023</span>
                <strong>Bilens dokumenterte historikk</strong>
                <small>Rapport opprettet 05.09.2026</small>
              </div>
              <div className="landing-report-score">
                <div className="landing-score-ring">
                  <span>18 mnd</span>
                  <small>historikk</small>
                </div>
                <div>
                  <span>Registrert periode</span>
                  <strong>Jevnlige registrerte målinger</strong>
                  <p>Dette er historikk, ikke målt batterihelse (SoH).</p>
                </div>
              </div>
              <div className="landing-report-table">
                {reportRows.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="landing-report-footer">
                <span>Kilde og dataperiode oppgitt</span>
                <span>Rapport-ID · GR-2409</span>
              </div>
            </div>
            <div className="landing-share-card">
              <span className="landing-share-icon">↗</span>
              <div>
                <strong>Klar til å deles</strong>
                <span>Send som lenke eller ta med i annonsen</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-how">
        <div className="landing-shell">
          <div className="landing-section-heading">
            <p className="landing-overline">Slik fungerer det</p>
            <h2>Koble tidlig. Bygg historikk. Del når det gjelder.</h2>
          </div>
          <div className="landing-step-grid">
            {steps.map((step, index) => (
              <article className="landing-step" key={step.number}>
                <span className="landing-step-number">{step.number}</span>
                {index < steps.length - 1 ? (
                  <span aria-hidden="true" className="landing-step-line" />
                ) : null}
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-faq" id="sporsmal">
        <div className="landing-shell landing-faq-grid">
          <div className="landing-faq-heading">
            <p className="landing-overline">Ærlige svar</p>
            <h2>Dette bør du vite før du stoler på en bilrapport.</h2>
            <p>
              Giret skal redusere usikkerhet uten å love mer enn dataene kan
              dokumentere.
            </p>
          </div>
          <div className="landing-faq-list">
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-security" id="trygghet">
        <div className="landing-shell landing-security-grid">
          <div className="landing-security-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M32 6 53 14v15c0 13.7-8.8 24.1-21 29C19.8 53.1 11 42.7 11 29V14L32 6Z" />
              <path d="m22 32 7 7 14-16" />
            </svg>
          </div>
          <div>
            <p className="landing-overline landing-overline-light">
              Dine data, ditt valg
            </p>
            <h2>Du deler historikken. Du gir ikke fra deg kontrollen.</h2>
          </div>
          <div className="landing-security-copy">
            <p>
              Giret ber bare om lesetilgang til tilgjengelige data fra bilen.
              Interessenter ser kun rapporten du velger å dele.
            </p>
            <span>Ingen fjernstyring av bilen</span>
            <span>Sikker tilkobling hos billeverandøren</span>
            <span>Målt, estimert og manglende data merkes tydelig</span>
          </div>
        </div>
      </section>

      <section className="landing-pilot" id="pilot">
        <div className="landing-shell landing-pilot-card">
          <div>
            <p className="landing-overline landing-overline-light">
              Har du elbil?
            </p>
            <h2>Hva ville du helst visst om batteriet ditt?</h2>
            <p>
              Logg inn for å åpne panelet. Der følger du rekkevidde, lading og
              historikk for bilen din. Historikk koster 1 000 kr i året.
              Salgsrapporten koster 400 kr når bilen skal vurderes.
            </p>
          </div>
          <a className="landing-button landing-button-lime" href="/login">
            Gå til panelet
            <ArrowIcon />
          </a>
          <span className="landing-pilot-note">
            Uforpliktende · vi svarer personlig
          </span>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-shell">
          <div className="landing-footer-main">
            <div>
              <GiretLogo />
              <p>Mer innsikt mens du eier. Mer trygghet når bilen skifter eier.</p>
            </div>
            <div className="landing-footer-links">
              <a href="#tjenester">Tjenester</a>
              <a href="#rapport">Salgsrapport</a>
              <a href="#sporsmal">Spørsmål</a>
              <a href="#trygghet">Personvern</a>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© 2026 Giret</span>
            <span>Bygges i Norge for et mer åpent bruktbilmarked.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
