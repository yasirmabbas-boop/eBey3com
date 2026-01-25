import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Settings, Trash2 } from "lucide-react";

export default function DataDeletion() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <Trash2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-primary mb-4">Data Deletion Instructions</h1>
          <p className="text-lg text-muted-foreground">
            We respect your right to privacy and control over your personal data
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">How to Request Data Deletion</CardTitle>
            <CardDescription>
              You have two options to request deletion of your data from Ebey3
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 items-start p-4 bg-muted rounded-lg">
              <Settings className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2">Option 1: Delete Account from Settings</h3>
                <ol className="list-decimal list-inside space-y-2 ml-2 text-muted-foreground">
                  <li>Log in to your Ebey3 account</li>
                  <li>Navigate to <strong>Settings</strong></li>
                  <li>Scroll down to find the <strong>"Delete Account"</strong> section</li>
                  <li>Click on <strong>"Delete My Account"</strong></li>
                  <li>Confirm your decision when prompted</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-4 items-start p-4 bg-muted rounded-lg">
              <Mail className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2">Option 2: Email Us</h3>
                <p className="text-muted-foreground mb-3">
                  Send an email to <a href="mailto:security@ebey3.com" className="text-primary font-semibold underline">security@ebey3.com</a> with the subject line "Data Deletion Request"
                </p>
                <p className="text-muted-foreground mb-2">Please include:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                  <li>Your full name</li>
                  <li>The email address or phone number associated with your account</li>
                  <li>Confirmation that you want to permanently delete your account and all associated data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">What Happens After You Request Deletion?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-lg max-w-none">
              <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                <li>
                  <strong>Timeline:</strong> We will permanently delete all personal data from our production database and all backups within <strong>30 days</strong> of request verification
                </li>
                <li>
                  <strong>What gets deleted:</strong> Your personal information including name, email, phone number, address, profile photo, Facebook User ID, and communication history
                </li>
                <li>
                  <strong>Legal retention:</strong> Transaction logs may be retained for 7 years for legal compliance (Iraqi law and US IRS regulations) but will be anonymized
                </li>
                <li>
                  <strong>Irreversible:</strong> Account deletion is permanent and cannot be undone. You will need to create a new account if you wish to use Ebey3 again
                </li>
                <li>
                  <strong>Confirmation:</strong> You will receive an email confirmation once your data has been deleted
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-lg mb-2 text-blue-900">Questions or Concerns?</h3>
          <p className="text-blue-800">
            If you have any questions about our data deletion process or privacy practices, please contact us at{" "}
            <a href="mailto:security@ebey3.com" className="font-semibold underline">security@ebey3.com</a>
          </p>
        </div>

        <div className="mt-12 text-center text-muted-foreground">
          <p>
            Read our full <a href="/privacy" className="text-primary underline">Privacy Policy</a> for more information about how we handle your data.
          </p>
        </div>
      </div>
    </Layout>
  );
}
