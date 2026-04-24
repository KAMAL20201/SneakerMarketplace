import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function meta() {
  return [
    { title: "Contact Us | The Plug Market — Authentic Sneakers India" },
    {
      name: "description",
      content:
        "Get in touch with The Plug Market support team. We're here to help with your orders, questions about authentic sneakers, and anything else.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://theplugmarket.in/contact-us",
    },
    { property: "og:url", content: "https://theplugmarket.in/contact-us" },
    { property: "og:title", content: "Contact The Plug Market" },
    {
      property: "og:description",
      content:
        "Get in touch with The Plug Market support team. We're here to help.",
    },
  ];
}

const WHATSAPP_NUMBER = "917888527970";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

export default function ContactUs() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ email?: string; message?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errs: { email?: string; message?: string } = {};
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail) {
      errs.email = "Email is required.";
    } else if (trimmedEmail.length > 254) {
      errs.email = "Email is too long.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address.";
    }

    if (!trimmedMessage) {
      errs.message = "Message is required.";
    } else if (trimmedMessage.length < MESSAGE_MIN) {
      errs.message = `Message must be at least ${MESSAGE_MIN} characters.`;
    } else if (trimmedMessage.length > MESSAGE_MAX) {
      errs.message = `Message must be under ${MESSAGE_MAX} characters.`;
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("contact_messages")
        .insert({ email: email.trim(), message: message.trim() });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you soon.");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Contact Us
          </h1>
          <p className="text-gray-600 text-lg">
            We're here to help! Get in touch with our support team.
          </p>
          <Badge variant="secondary" className="mt-3">
            Available 24/7
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Contact Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Send className="h-5 w-5 text-blue-600" />
                Send us a Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    }}
                    className={errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">
                    Message{" "}
                    <span className="text-gray-400 font-normal">
                      ({message.length}/{MESSAGE_MAX})
                    </span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us how we can help..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (errors.message) setErrors((p) => ({ ...p, message: undefined }));
                    }}
                    rows={5}
                    maxLength={MESSAGE_MAX}
                    className={errors.message ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  {errors.message && (
                    <p className="text-xs text-red-500">{errors.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* WhatsApp Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <WhatsAppIcon className="h-5 w-5 text-green-500" />
                WhatsApp Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Prefer to chat? Reach us instantly on WhatsApp for quick support.
              </p>
              <div className="bg-green-50 rounded-lg p-4 text-sm text-green-800">
                Typically replies within minutes during business hours.
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="w-full border-green-500 text-green-700 hover:bg-green-50 gap-2"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Chat on WhatsApp
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Response Times */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Response Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Email / Message Form</h3>
                <p className="text-blue-600 font-bold">Within 24 hours</p>
                <p className="text-sm text-gray-600">Usually within 4-6 hours</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">WhatsApp</h3>
                <p className="text-green-600 font-bold">Usually instant</p>
                <p className="text-sm text-gray-600">During business hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
