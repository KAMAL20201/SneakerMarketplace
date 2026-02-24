import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { Bell } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "deal_sub_done";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

const DealSubscriptionBanner = () => {
  const [subscribed, setSubscribed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "1"
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (subscribed) return null;

  const onSubmit = async ({ email }: FormValues) => {
    const { error } = await supabase
      .from("deal_subscriptions")
      .insert({ email });

    if (!error) {
      localStorage.setItem(STORAGE_KEY, "1");
      setSubscribed(true);
      toast.success("You're in! We'll email you the hottest deals 🔥");
      reset();
    } else if (error.code === "23505") {
      localStorage.setItem(STORAGE_KEY, "1");
      setSubscribed(true);
      toast.info("You're already subscribed to deal alerts!");
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <section className="px-4 py-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl border border-orange-100 bg-orange-50"
      >
        {/* Left: icon + text */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 flex-shrink-0">
            <Bell className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-800 leading-tight">
              Get Deal Alerts
            </p>
            <p className="text-xs text-gray-500">
              50% off or more — straight to your inbox
            </p>
          </div>
        </div>

        {/* Right: input + button */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              {...register("email")}
              type="email"
              placeholder="your@email.com"
              className="flex-1 sm:w-48 rounded-full px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 border border-orange-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-shrink-0 px-4 py-2 rounded-full border border-orange-300 bg-white text-orange-600 text-sm font-semibold hover:bg-orange-600 hover:text-white transition-colors duration-200 disabled:opacity-60 whitespace-nowrap"
            >
              {isSubmitting ? "..." : "Notify Me"}
            </button>
          </div>
          {errors.email && (
            <p className="text-xs text-orange-500 pl-1">
              {errors.email.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
};

export default DealSubscriptionBanner;
