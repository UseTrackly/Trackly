import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
            <p className="text-sm text-muted-foreground mb-2">Last updated March 20, 2026</p>
            <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">
              These Terms govern your access to and use of Trackly. Please read them carefully before using the platform.
            </p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold mb-4">01 Acceptance of Terms</h2>
              
              <h3 className="text-lg font-semibold mb-2">Agreement to Terms</h3>
              <p className="text-muted-foreground mb-4">
                By accessing or using Trackly, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the service.
              </p>

              <h3 className="text-lg font-semibold mb-2">Eligibility</h3>
              <p className="text-muted-foreground mb-4">
                You must be at least 16 years old to use Trackly. By using the service, you represent and warrant that you meet this requirement and have the legal capacity to enter into a binding agreement.
              </p>

              <h3 className="text-lg font-semibold mb-2">Changes to Terms</h3>
              <p className="text-muted-foreground">
                We may update these Terms from time to time. We will notify you of material changes via email or an in-app notice. Continued use of Trackly after changes take effect constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">02 Your Account</h2>
              
              <h3 className="text-lg font-semibold mb-2">Account Registration</h3>
              <p className="text-muted-foreground mb-4">
                To access most features, you must create an account using a valid email address. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.
              </p>

              <h3 className="text-lg font-semibold mb-2">Accurate Information</h3>
              <p className="text-muted-foreground mb-4">
                You agree to provide accurate, current, and complete information during registration and to keep your account information up to date at all times.
              </p>

              <h3 className="text-lg font-semibold mb-2">Account Security</h3>
              <p className="text-muted-foreground">
                You agree to notify us immediately at support@trackly.to if you suspect any unauthorised use of your account. We are not liable for any loss or damage arising from your failure to maintain adequate account security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">03 Acceptable Use</h2>
              
              <h3 className="text-lg font-semibold mb-2">Permitted Use</h3>
              <p className="text-muted-foreground mb-4">
                Trackly is provided for personal and commercial use to track resale transactions, calculate margins, and manage flip profitability. You may use Trackly only for lawful purposes consistent with these Terms.
              </p>

              <h3 className="text-lg font-semibold mb-2">Prohibited Activities</h3>
              <p className="text-muted-foreground mb-4">
                You must not: attempt to reverse-engineer or circumvent security measures; use automated scripts to scrape or overload the platform; share your account credentials with third parties; submit false or misleading data; or use Trackly for any illegal activity including tax evasion or money laundering.
              </p>

              <h3 className="text-lg font-semibold mb-2">Content You Submit</h3>
              <p className="text-muted-foreground">
                You retain ownership of all data you enter into Trackly. By submitting data, you grant us a limited licence to store, process, and display it solely for the purpose of providing the service to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">04 Subscription & Billing</h2>
              
              <h3 className="text-lg font-semibold mb-2">Free & Pro Plans</h3>
              <p className="text-muted-foreground mb-4">
                Trackly offers a free tier with limited features and a Pro plan with full access. Plan details, including feature availability and pricing, are described on the Product page and may be updated at our discretion.
              </p>

              <h3 className="text-lg font-semibold mb-2">Payments</h3>
              <p className="text-muted-foreground mb-4">
                Pro subscriptions are billed via Stripe. By subscribing, you authorise us to charge your payment method on a recurring basis (monthly or as per your chosen plan). All charges are in USD unless stated otherwise.
              </p>

              <h3 className="text-lg font-semibold mb-2">Cancellation & Refunds</h3>
              <p className="text-muted-foreground mb-4">
                You may cancel your Pro subscription at any time. Cancellation takes effect at the end of the current billing period — you will retain access until then. We do not offer refunds for partial billing periods except where required by applicable law.
              </p>

              <h3 className="text-lg font-semibold mb-2">Lifetime Access</h3>
              <p className="text-muted-foreground">
                Lifetime plan purchases are one-time payments granting indefinite access to Pro features as they exist at the time of purchase and future feature updates. Lifetime plans are non-refundable after 14 days from purchase.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">05 Intellectual Property</h2>
              
              <h3 className="text-lg font-semibold mb-2">Trackly Ownership</h3>
              <p className="text-muted-foreground mb-4">
                All content, features, design, trademarks, and underlying technology of Trackly are owned by or licensed to Trackly and are protected by applicable intellectual property laws. You may not copy, reproduce, or distribute any part of the platform without our prior written consent.
              </p>

              <h3 className="text-lg font-semibold mb-2">Your Data</h3>
              <p className="text-muted-foreground">
                You own all the data you input into Trackly. We claim no intellectual property rights over your flip records, profit entries, or any other content you create within the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">06 Disclaimers & Limitation of Liability</h2>
              
              <h3 className="text-lg font-semibold mb-2">No Financial Advice</h3>
              <p className="text-muted-foreground mb-4">
                Trackly is a data tracking and analytics tool. Nothing on Trackly constitutes financial, tax, legal, or investment advice. You are solely responsible for your own resale business decisions and tax obligations.
              </p>

              <h3 className="text-lg font-semibold mb-2">Service Availability</h3>
              <p className="text-muted-foreground mb-4">
                We strive for high availability but do not guarantee that Trackly will be uninterrupted, error-free, or free of harmful components. The service is provided on an "as is" and "as available" basis.
              </p>

              <h3 className="text-lg font-semibold mb-2">Limitation of Liability</h3>
              <p className="text-muted-foreground">
                To the maximum extent permitted by law, Trackly and its team shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including loss of profits or data, even if advised of the possibility of such damages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">07 Termination</h2>
              
              <h3 className="text-lg font-semibold mb-2">Termination by You</h3>
              <p className="text-muted-foreground mb-4">
                You may stop using Trackly and delete your account at any time via the dashboard settings or by contacting us.
              </p>

              <h3 className="text-lg font-semibold mb-2">Termination by Us</h3>
              <p className="text-muted-foreground mb-4">
                We reserve the right to suspend or terminate your account if we reasonably believe you have violated these Terms, engaged in fraudulent activity, or pose a risk to other users or the platform.
              </p>

              <h3 className="text-lg font-semibold mb-2">Effect of Termination</h3>
              <p className="text-muted-foreground">
                Upon termination, your right to use Trackly ceases immediately. We will delete your data in accordance with our Privacy Policy retention schedule.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">08 Governing Law</h2>
              
              <h3 className="text-lg font-semibold mb-2">Jurisdiction</h3>
              <p className="text-muted-foreground mb-4">
                These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>

              <h3 className="text-lg font-semibold mb-2">Severability</h3>
              <p className="text-muted-foreground">
                If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Refund Policy</h2>
              
              <h3 className="text-lg font-semibold mb-2">All Sales Are Final</h3>
              <p className="text-muted-foreground mb-4">
                All purchases made through Trackly are final. Due to the nature of digital products, we do not offer refunds, returns, or exchanges once access has been granted.
              </p>

              <h3 className="text-lg font-semibold mb-2">Exceptions & Disputes</h3>
              <p className="text-muted-foreground mb-4">
                If you experience a technical issue or believe you were charged incorrectly, please contact us at hello@trackly.to and we will review your case.
              </p>

              <h3 className="text-lg font-semibold mb-2">Discretionary Refunds</h3>
              <p className="text-muted-foreground">
                We reserve the right to issue refunds at our sole discretion on a case-by-case basis.
              </p>
            </section>

            <section className="border-t border-border pt-6">
              <h2 className="text-xl font-bold mb-3">Questions About These Terms?</h2>
              <p className="text-muted-foreground">
                If you have any questions or concerns about these Terms of Service, reach out to us directly:{' '}
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