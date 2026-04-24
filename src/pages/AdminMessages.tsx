import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect } from "react";
import { Mail, CheckCheck, Clock, Reply, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ContactMessage {
  id: string;
  email: string;
  message: string;
  is_read: boolean;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [expandedReply, setExpandedReply] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load messages");
    } else {
      setMessages(data ?? []);
    }
    setLoading(false);
  }

  async function markAsRead(id: string, isRead: boolean) {
    const { error } = await supabase
      .from("contact_messages")
      .update({ is_read: !isRead })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update message");
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_read: !isRead } : m))
    );
  }

  async function sendReply(msg: ContactMessage) {
    const replyText = replyDrafts[msg.id]?.trim();
    if (!replyText) return;

    setSendingReply(msg.id);
    try {
      const { error: fnError } = await supabase.functions.invoke(
        "send-contact-reply",
        {
          body: {
            to_email: msg.email,
            reply_message: replyText,
            original_message: msg.message,
          },
        }
      );

      if (fnError) throw fnError;

      const now = new Date().toISOString();
      const { error: dbError } = await supabase
        .from("contact_messages")
        .update({ admin_reply: replyText, replied_at: now, is_read: true })
        .eq("id", msg.id);

      if (dbError) throw dbError;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, admin_reply: replyText, replied_at: now, is_read: true }
            : m
        )
      );
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      setExpandedReply(null);
      toast.success(`Reply sent to ${msg.email}`);
    } catch {
      toast.error("Failed to send reply. Please try again.");
    } finally {
      setSendingReply(null);
    }
  }

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-600" />
              Contact Messages
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {messages.length} total · {unreadCount} unread
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMessages}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-white rounded-xl shadow animate-pulse"
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <Card className="border-0 shadow">
            <CardContent className="py-16 text-center text-gray-400">
              No messages yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <Card
                key={msg.id}
                className={`border-0 shadow transition-all ${
                  !msg.is_read ? "border-l-4 border-l-blue-500" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold text-gray-900">
                        {msg.email}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {new Date(msg.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {msg.admin_reply && (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300 text-xs"
                        >
                          Replied
                        </Badge>
                      )}
                      <Badge
                        variant={msg.is_read ? "secondary" : "default"}
                        className="text-xs cursor-pointer"
                        onClick={() => markAsRead(msg.id, msg.is_read)}
                      >
                        {msg.is_read ? (
                          <span className="flex items-center gap-1">
                            <CheckCheck className="h-3 w-3" /> Read
                          </span>
                        ) : (
                          "Unread"
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </p>

                  {msg.admin_reply ? (
                    <div className="bg-purple-50 border-l-2 border-purple-400 rounded-r-lg p-3">
                      <p className="text-xs font-semibold text-purple-600 mb-1">
                        Your reply ·{" "}
                        {msg.replied_at
                          ? new Date(msg.replied_at).toLocaleString("en-IN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : ""}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {msg.admin_reply}
                      </p>
                    </div>
                  ) : (
                    <>
                      {expandedReply === msg.id ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Type your reply..."
                            rows={4}
                            value={replyDrafts[msg.id] ?? ""}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [msg.id]: e.target.value,
                              }))
                            }
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => sendReply(msg)}
                              disabled={
                                sendingReply === msg.id ||
                                !replyDrafts[msg.id]?.trim()
                              }
                              className="gap-1"
                            >
                              <Send className="h-3.5 w-3.5" />
                              {sendingReply === msg.id
                                ? "Sending..."
                                : "Send Reply"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedReply(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={() => {
                            setExpandedReply(msg.id);
                            if (!msg.is_read) markAsRead(msg.id, false);
                          }}
                        >
                          <Reply className="h-3.5 w-3.5" />
                          Reply
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <AdminRoute>
      <AdminMessages />
    </AdminRoute>
  );
}
