import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { authApi, shopsApi } from "@/services/apiClient"
import { useNavigate } from "react-router-dom"

interface UserFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone?: string
}

interface ShopFormData {
  name: string
  address: string
  phone: string
  vatRate: string
  currency: string
}

export function SignupForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const navigate = useNavigate()
  const [step, setStep] = useState<"user" | "shop">("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { register: registerUser, handleSubmit: handleSubmitUser, watch, formState: { errors: userErrors } } = useForm<UserFormData>()
  const { register: registerShop, handleSubmit: handleSubmitShop, formState: { errors: shopErrors } } = useForm<ShopFormData>({
    defaultValues: { currency: "USD", vatRate: "10" }
  })

  const password = watch("password")

  const onSubmitUser = async (data: UserFormData) => {
    setLoading(true)
    setError("")
    try {
      if (data.password !== data.confirmPassword) throw new Error("Passwords do not match")
      await authApi.register({ email: data.email, password: data.password, name: data.name, role: "seller" })
      setStep("shop")
    } catch (err: any) {
      setError(err?.message || "Failed to create account.")
    } finally {
      setLoading(false)
    }
  }

  const onSubmitShop = async (data: ShopFormData) => {
    setLoading(true)
    setError("")
    try {
      await shopsApi.create({
        name: data.name,
        description: `${data.address} | ${data.phone}`,
        address: data.address,
        phone: data.phone,
        currency: data.currency,
        vatRate: Number(data.vatRate) || undefined,
      })
      navigate("/pending-approval")
    } catch (err: any) {
      setError(err?.message || "Failed to create business.")
    } finally {
      setLoading(false)
    }
  }

  const renderUserForm = () => (
    <form onSubmit={handleSubmitUser(onSubmitUser)} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="name">Full Name</FieldLabel>
        <Input id="name" type="text" placeholder="John Doe" {...registerUser("name", { required: true })} />
      </Field>
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" placeholder="m@example.com" {...registerUser("email", { required: true })} />
        <FieldDescription>
          We&apos;ll use this to contact you. We will not share your email
          with anyone else.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input id="password" type="password" {...registerUser("password", { required: true, minLength: 6 })} />
        <FieldDescription>
          Must be at least 6 characters long.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
        <Input id="confirm-password" type="password" {...registerUser("confirmPassword", { required: true })} />
        <FieldDescription>Please confirm your password.</FieldDescription>
      </Field>
      <Field>
        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
      </Field>
    </form>
  )

  const renderShopForm = () => (
    <form onSubmit={handleSubmitShop(onSubmitShop)} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="business-name">Business Name</FieldLabel>
        <Input id="business-name" type="text" placeholder="Acme Inc" {...registerShop("name", { required: true })} />
      </Field>
      <Field>
        <FieldLabel htmlFor="address">Address</FieldLabel>
        <Input id="address" type="text" placeholder="123 Main St" {...registerShop("address", { required: true })} />
      </Field>
      <Field>
        <FieldLabel htmlFor="phone">Phone</FieldLabel>
        <Input id="phone" type="tel" placeholder="+1 555 555" {...registerShop("phone", { required: true })} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="currency">Currency</FieldLabel>
          <Input id="currency" type="text" placeholder="USD" {...registerShop("currency", { required: true })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="vat">VAT Rate (%)</FieldLabel>
          <Input id="vat" type="number" placeholder="10" {...registerShop("vatRate")} />
        </Field>
      </div>
      <Field>
        <Button type="submit" disabled={loading}>{loading ? 'Creating Business...' : 'Create Business'}</Button>
      </Field>
    </form>
  )

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Fill in the form below to create your account
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        )}
        {step === "user" ? renderUserForm() : renderShopForm()}
        <Field>
          
          <FieldDescription className="px-6 text-center">
            Already have an account? <a href="/login">Sign in</a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  )
}
