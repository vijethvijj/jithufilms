import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle, MapPin, Send } from "lucide-react";
import { studioConfig } from "@/data/siteConfig";

const serviceOptions = ["Wedding Photography", "Cinematic Wedding Films", "Pre-Wedding Photography", "Engagement Photography", "Albums and Prints"];
const eventOptions = ["Wedding", "Engagement", "Pre-wedding", "Portraits", "Special event", "Other"];

interface BookingFormProps {
  initialService: string;
}

export default function BookingForm({ initialService }: BookingFormProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [whatsappHref, setWhatsappHref] = useState<string | null>(null);

  useEffect(() => {
    if (initialService && serviceOptions.includes(initialService)) {
      setSelectedServices(current => current.includes(initialService) ? current : [...current, initialService]);
    }
  }, [initialService]);

  const toggleService = (service: string) => {
    setSelectedServices(current => current.includes(service) ? current.filter(item => item !== service) : [...current, service]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const enquiry = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      eventType: String(data.get("eventType") ?? ""),
      eventDate: String(data.get("eventDate") ?? ""),
      eventLocation: String(data.get("eventLocation") ?? ""),
      message: String(data.get("message") ?? ""),
    };
    const whatsappMessage = [
      `Hello ${studioConfig.name}, I'd like to enquire about your services.`,
      "",
      `Name: ${enquiry.name}`,
      `Email: ${enquiry.email}`,
      `Phone: ${enquiry.phone || "Not provided"}`,
      `Event: ${enquiry.eventType}`,
      `Date: ${enquiry.eventDate}`,
      `Location: ${enquiry.eventLocation || "Not provided"}`,
      `Services: ${selectedServices.join(", ")}`,
      `Message: ${enquiry.message || "None"}`,
    ].join("\n");
    const whatsappHref = `${studioConfig.whatsappUrl}?text=${encodeURIComponent(whatsappMessage)}`;
    setStatus(null);
    setWhatsappHref(whatsappHref);
    setSending(true);
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...enquiry,
          services: selectedServices,
          website: String(data.get("website") ?? ""),
        }),
      });
      const result: { message?: string } = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "We couldn't save your enquiry. Please check the details and try again.");
      setStatus({ type: "success", message: "Your enquiry has been saved. WhatsApp opened with your message ready—tap Send there to contact the studio." });
      form.reset();
      setSelectedServices([]);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    } finally {
      setSending(false);
    }
  };

  const mailHref = studioConfig.email ? `mailto:${studioConfig.email}` : undefined;

  return (
    <section className="booking-section section-pad" id="contact" aria-labelledby="contact-title">
      <div className="page-shell booking-layout">
        <div className="booking-copy">
          <p className="eyebrow"><span className="eyebrow__rule" /> Begin here</p>
          <h2 id="contact-title">Let's create<br /><em>something beautiful.</em></h2>
          <p className="booking-copy__intro">Tell us a little about what you're planning. We'll keep the first conversation simple.</p>
          <div className="booking-contact-list">
            <div className="booking-contact"><span>EMAIL</span>{mailHref ? <a href={mailHref}>{studioConfig.email}{studioConfig.emailIsPlaceholder && <small>Sample address · replace before launch</small>}</a> : <span>Add studio email in `siteConfig.ts`</span>}</div>
            <div className="booking-contact"><span>WHATSAPP</span>{studioConfig.whatsappUrl ? <a href={studioConfig.whatsappUrl} target="_blank" rel="noreferrer">+91 97402 77028 <ArrowUpRight size={14} /></a> : <a href="#booking-form">Add studio number before launch <ArrowUpRight size={14} /></a>}</div>
            <div className="booking-contact"><span>INSTAGRAM</span>{studioConfig.instagramUrl ? <a href={studioConfig.instagramUrl} target="_blank" rel="noreferrer">Follow along <ArrowUpRight size={14} /></a> : <a href="#booking-form">Add studio profile before launch <ArrowUpRight size={14} /></a>}</div>
            <div className="booking-contact">
              <span>STUDIO</span>
              {studioConfig.location ? (
                <a className="booking-contact__location-link" href={studioConfig.location} target="_blank" rel="noreferrer" aria-label="Open studio location in Google Maps">
                  <MapPin size={15} aria-hidden="true" />
                  <span>View location</span>
                </a>
              ) : (
                <span>Studio location not provided</span>
              )}
            </div>
          </div>
          <p className="booking-storage-note">Submit the form to save your enquiry and open WhatsApp with your details ready to send.</p>
        </div>

        <form className="booking-form" id="booking-form" onSubmit={submit}>
          <div className="booking-form__heading"><span>01 — YOUR DETAILS</span><span>Fields marked * are required</span></div>
          <div className="form-grid">
            <label className="form-field"><span>Full name <i>*</i></span><input name="name" type="text" autoComplete="name" minLength={2} maxLength={120} placeholder="Your name" required /></label>
            <label className="form-field"><span>Email address <i>*</i></span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required /></label>
            <label className="form-field"><span>Phone number</span><input name="phone" type="tel" autoComplete="tel" maxLength={32} placeholder="Country code + number" /></label>
            <label className="form-field"><span>Event type <i>*</i></span><select name="eventType" defaultValue="" required><option value="" disabled>Select an event</option>{eventOptions.map(option => <option key={option}>{option}</option>)}</select></label>
            <label className="form-field"><span>Event date <i>*</i></span><input name="eventDate" type="date" required /></label>
            <label className="form-field"><span>Event location</span><input name="eventLocation" type="text" maxLength={180} placeholder="City or venue" /></label>
            <fieldset className="form-services"><legend>Services required <i>*</i></legend><div className="form-services__options">{serviceOptions.map(service => <label key={service} className={selectedServices.includes(service) ? "is-selected" : ""}><input type="checkbox" checked={selectedServices.includes(service)} onChange={() => toggleService(service)} /><span>{selectedServices.includes(service) && <Check size={12} />}</span>{service}</label>)}</div><small className="sr-only" aria-live="polite">{selectedServices.length ? `${selectedServices.length} services selected` : "Select at least one service"}</small></fieldset>
            <label className="form-field form-field--wide"><span>Tell us a little more</span><textarea name="message" rows={4} maxLength={3000} placeholder="What are you dreaming up? Anything you'd like us to know?" /></label>
            <label className="form-trap" aria-hidden="true" tabIndex={-1}>Leave this field empty<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <div className="booking-form__submit"><button className="button button--dark" type="submit" disabled={sending || selectedServices.length === 0}>{sending ? <><LoaderCircle className="spin" size={16} /> Saving enquiry…</> : <>Enquire on WhatsApp <Send size={15} /></>}</button><p>We’ll save your enquiry and open WhatsApp. Review the message and tap Send to contact us.</p></div>
          {status && <div className={`form-status form-status--${status.type}`} role={status.type === "error" ? "alert" : "status"} aria-live="polite">{status.type === "success" ? <Check size={17} /> : <span aria-hidden="true">!</span>}<span>{status.message}{whatsappHref && <> <a href={whatsappHref} target="_blank" rel="noreferrer">Open WhatsApp message <ArrowUpRight size={13} /></a></>}</span></div>}
        </form>
      </div>
    </section>
  );
}
