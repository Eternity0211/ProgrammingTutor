import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";

interface InvitePeopleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classCode: string;
}

export default function InvitePeopleDialog({
  open,
  onOpenChange,
  classCode,
}: InvitePeopleDialogProps) {
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/join?code=${classCode}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite People</DialogTitle>
          <DialogDescription>Invite students to class.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Class Invite Link</label>
              <div className="flex">
                <Input
                  readOnly
                  value={inviteLink}
                  className="rounded-r-none border-border"
                />
                <Button
                  className="rounded-l-none bg-primary-button text-white hover:bg-primary-button-hover"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can join your class. The link expires in 7
                days.
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Class Code</label>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium tracking-wider">
                  {classCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-border"
                  onClick={() => navigator.clipboard.writeText(classCode)}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Students can use this code to join your class.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
