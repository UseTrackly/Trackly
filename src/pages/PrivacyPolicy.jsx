import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <p className="text-sm text-muted-foreground mb-2">Last updated April 22, 2026</p>
            <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              At Trackly, we believe your financial data is private by default. This policy explains exactly what we collect, why we collect it, and how you stay in control.
            </p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>

              <h3 className="text-lg font-semibold mb-2">Account Information</h3>
              <p className="text-muted-foreground mb-2">
                When you create a Trackly account, we collect:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
                <li>Email address (required for authentication)</li>
                <li>Display name / full name</li>
                <li>Profile photo (optional, user-provided)</li>
                <li>Username and bio (optional, user-provided)</li>
                <li>Location (optional, user-provided)</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                This information is used solely to identify you within the platform and personalise your experience.
              </p>

              <h3 className="text-lg font-semibold mb-2">Financial & Business Data</h3>
              <p className="text-muted-foreground mb-2">
                When you use Trackly's core features, we store:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
                <li>Flip records (buy price, sale price, platform, fees, profit, ROI)</li>
                <li>Inventory items (item name, cost basis, condition, photos)</li>
                <li>Business expenses (description, category, amount, receipts)</li>
                <li>Community posts and associated images</li>
                <li>Price alert preferences</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                All financial data is private to your account. We do not share, sell, or analyse your financial data for advertising purposes.
              </p>

              <h3 className="text-lg font-semibold mb-2">Device & Usage Information</h3>
              <p className="text-muted-foreground mb-2">
                We automatically collect limited technical information including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
                <li>Device type and operating system</li>
                <li>App version</li>
                <li>Session duration and feature interactions (anonymised)</li>
                <li>Crash reports and error logs (no personally identifiable data)</li>
              </ul>
              <p className="text-muted-foreground">
                This data is used exclusively to improve app stability and the user experience.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">How We Use Your Data</h2>
              
              <h3 className="text-lg font-semibold mb-2">Service Delivery</h3>
              <p className="text-muted-foreground mb-4">
                Your data powers the core Trackly experience: tracking flips, calculating margins, generating reports, and displaying your performance dashboard.
              </p>

              <h3 className="text-lg font-semibold mb-2">Communication</h3>
              <p className="text-muted-foreground mb-4">
                We may send you transactional emails (e.g. password resets, billing receipts) and, if opted in, product updates and tips. You can unsubscribe from marketing emails at any time.
              </p>

              <h3 className="text-lg font-semibold mb-2">Security & Fraud Prevention</h3>
              <p className="text-muted-foreground">
                We use your login activity and device information to detect suspicious access, prevent unauthorised logins, and keep your account safe.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Data Sharing & Third Parties</h2>
              
              <h3 className="text-lg font-semibold mb-2">We Do Not Sell Your Data</h3>
              <p className="text-muted-foreground mb-4">
                Trackly does not sell, rent, or trade your personal information to any third party for commercial or advertising purposes. Full stop.
              </p>

              <h3 className="text-lg font-semibold mb-2">Service Providers</h3>
              <p className="text-muted-foreground mb-2">
                We work with the following trusted sub-processors who handle data strictly on our behalf under data processing agreements:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
                <li><strong>Supabase</strong> — database hosting and authentication</li>
                <li><strong>Stripe</strong> — payment processing (web only; no card data is stored by Trackly)</li>
                <li><strong>Resend</strong> — transactional email delivery</li>
                <li><strong>OpenAI / Google AI</strong> — AI assistant features (prompts are not stored long-term)</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                None of these providers are permitted to use your data for their own marketing or advertising purposes.
              </p>

              <h3 className="text-lg font-semibold mb-2">Legal Requirements</h3>
              <p className="text-muted-foreground">
                We may disclose information if required by law, court order, or to protect the rights, property, or safety of Trackly, our users, or the public.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Data Retention & Deletion</h2>
              
              <h3 className="text-lg font-semibold mb-2">Retention Policy</h3>
              <p className="text-muted-foreground mb-4">
                We retain your account data for as long as your account is active. Anonymised analytics data may be retained for up to 24 months to identify long-term product trends.
              </p>

              <h3 className="text-lg font-semibold mb-2">Account Deletion</h3>
              <p className="text-muted-foreground mb-4">
                You can delete your account and all associated data directly within the app: go to <strong>Profile → Account → Delete Account</strong>. All personal data, flip records, inventory, and expenses will be permanently deleted within 30 days.
              </p>
              <p className="text-muted-foreground">
                You may also request deletion by emailing{' '}
                <a href="mailto:support@trackly.to" className="text-primary hover:underline">support@trackly.to</a>.
                We will confirm and process your request within 14 business days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
              <p className="text-muted-foreground">
                Trackly is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal data, we will delete it promptly. If you believe your child has provided us with information, please contact us at{' '}
                <a href="mailto:support@trackly.to" className="text-primary hover:underline">support@trackly.to</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
              
              <h3 className="text-lg font-semibold mb-2">Access & Portability</h3>
              <p className="text-muted-foreground mb-4">
                You have the right to request a copy of all personal data we hold about you in a machine-readable format.
              </p>

              <h3 className="text-lg font-semibold mb-2">Correction & Erasure</h3>
              <p className="text-muted-foreground mb-4">
                You can update your account details at any time from your dashboard settings. For erasure requests beyond in-app controls, contact us directly.
              </p>

              <h3 className="text-lg font-semibold mb-2">GDPR & CCPA</h3>
              <p className="text-muted-foreground">
                If you are located in the EU or California, you have additional rights under GDPR and CCPA respectively, including the right to object to processing and the right to opt out of data sales (we don't do this, but the right applies).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Cookies</h2>
              
              <h3 className="text-lg font-semibold mb-2">Essential Cookies</h3>
              <p className="text-muted-foreground mb-4">
                We use strictly necessary cookies to maintain your session, remember your theme preference, and keep you signed in. These cannot be disabled.
              </p>

              <h3 className="text-lg font-semibold mb-2">Analytics Cookies</h3>
              <p className="text-muted-foreground">
                With your consent, we use anonymous analytics cookies to understand traffic patterns and improve the platform. You can opt out via your browser settings.
              </p>
            </section>

            <section className="border-t border-border pt-6">
              <h2 className="text-xl font-bold mb-3">Questions or Requests?</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, or wish to exercise your data rights, contact our privacy team directly:{' '}
                <a href="mailto:support@trackly.to" className="text-primary hover:underline">
                  support@trackly.to
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}