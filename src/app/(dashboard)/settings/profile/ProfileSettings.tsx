"use client";
import { Button } from "@/app/_components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/_components/ui/form";
import { Input } from "@/app/_components/ui/input";
import { isValidUrl, titleCase } from "@/lib/utils";
import {
  type AccountUpdateSchema,
  accountUpdateSchema,
} from "@/lib/validators/auth";
import { updateUserName } from "@/server/actions/user-actions";
import { getLoginMethod } from "@/server/actions/utility-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loading03Icon } from "hugeicons-react";
import { User } from "next-auth";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function ProfileSettings({ user }: { user: User | undefined }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonText, setButtonText] = useState("Save Changes");
  const [userLoginMethod, setUserLoginMethod] = useState<string | null>();

  useEffect(() => {
    const userLoginMethod = async () => {
      if (user?.id) {
        const loginMethod = await getLoginMethod(user.id);
        setUserLoginMethod(loginMethod);
      }
    };
    userLoginMethod();
  }, [user?.id, setUserLoginMethod]);

  const name = user?.name;
  const firstName = user?.name?.split(" ")[0];
  const lastName = user?.name?.split(" ")[1];
  const email = user?.email;
  const profileImageUrl = user?.image
    ? isValidUrl(user.image)
      ? user.image
      : `https://ui-avatars.com/api/?name=${name ?? ""}`
    : `https://ui-avatars.com/api/?name=${name ?? ""}`;

  const form = useForm<AccountUpdateSchema>({
    resolver: zodResolver(accountUpdateSchema),
    defaultValues: {
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      displayName: name ?? "",
      primaryEmail: email ?? "",
      profileImageURL: profileImageUrl,
    },
    mode: "onChange",
  });

  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    // Validate all fields using react-hook-form
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }
    console.log("asdfsdf");
    setIsSubmitting(true);
    setButtonText("Saving Changes...");

    try {
      const values = form.getValues();
      const firstName = values.firstName;
      const lastName = values.lastName;
      if (firstName || lastName) {
        const newName = `${firstName} ${lastName}`.trim();
        await updateUserName(newName);
      }
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
      setButtonText("Save Changes");
    }
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-foreground">
                Personal Info
              </h2>
              <p className="text-sm font-medium text-muted-foreground">
                Update your personal details here
              </p>
            </div>
            <Button
              type="submit"
              disabled={!form.formState.isDirty || isSubmitting}
              className="w-full sm:w-auto bg-primary-button text-white hover:bg-primary-button-hover"
            >
              {isSubmitting ? (
                <>
                  <Loading03Icon className="mr-2 h-4 w-4 animate-spin" />
                  {buttonText}
                </>
              ) : (
                buttonText
              )}
            </Button>
          </div>

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <div className="space-y-6">
            <div
              className="flex flex-col gap-4 sm:flex-row sm:items-center"
              id="name"
            >
              <FormLabel className="w-full sm:w-1/2 font-medium text-foreground">
                Name
              </FormLabel>
              <div className="grid w-full sm:w-1/2 grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="First Name"
                          className="h-12 border border-input bg-background text-foreground focus-visible:ring-ring"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Last Name"
                          className="h-12 border border-input bg-background text-foreground focus-visible:ring-ring"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <FormLabel className="w-full sm:w-1/2 font-medium text-foreground">
                Email Address
                <p className="mt-2 text-sm text-muted-foreground">
                  (Logged in with {titleCase(userLoginMethod ?? "Google")})
                </p>
              </FormLabel>
              <FormField
                control={form.control}
                name="primaryEmail"
                render={({ field }) => (
                  <FormItem className="w-full sm:w-1/2">
                    <FormControl>
                      <Input
                        type="email"
                        className="h-12"
                        disabled={true}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* //profile picture */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <FormLabel className="w-full sm:w-1/2 font-medium text-foreground">
                Profile Photo
              </FormLabel>
              <div className="w-full sm:w-1/2">
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="h-16 w-16 rounded-full border border-border"
                />
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
