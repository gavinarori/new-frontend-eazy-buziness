"use client"

import type React from "react"
import { Clock, Mail, CheckCircle, Building2, ArrowLeft } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const PendingApproval: React.FC = () => {
  const { userData, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-950 dark:to-orange-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto">
              <Clock size={40} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <CardTitle className="text-3xl">Account Pending Approval</CardTitle>
              <CardDescription className="text-base mt-2">Your business registration is being reviewed</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Info */}
            {userData && (
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                        <Building2 size={24} />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-semibold">{userData.name}</h2>
                      <p className="text-muted-foreground">{userData.email}</p>
                      <Badge variant="secondary" className="mt-1 capitalize">
                        {userData.role?.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Information */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Registration Submitted</h3>
                  <p className="text-sm text-muted-foreground">
                    Your business registration has been successfully submitted.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Under Review</h3>
                  <p className="text-sm text-muted-foreground">
                    Our team is currently reviewing your business information and will approve your account shortly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Mail size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-muted-foreground">Email Notification</h3>
                  <p className="text-sm text-muted-foreground">
                    You'll receive an email notification once your account is approved and activated.
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertTitle className="text-blue-800 dark:text-blue-200">What happens next?</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <ul className="space-y-2 mt-2">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Our team will review your business registration within 24-48 hours
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    You'll receive an email notification once your account is approved
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    After approval, you can log in and start managing your business
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    You'll be able to add staff members, manage inventory, and create invoices
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={handleLogout} className="flex-1 bg-transparent">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Sign Out
              </Button>

              <Button onClick={handleLogout} className="flex-1">
                Back to Login
              </Button>
            </div>

            {/* Contact Support */}
            <div className="pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Need help or have questions?{" "}
                <a href="mailto:support@easybizness.com" className="text-primary hover:underline font-medium">
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PendingApproval
