// 'use client';

// import { Button } from '@/app/_components/ui/button';
// import { Checkbox } from '@/app/_components/ui/checkbox';
// import {
//   Dialog,
//   DialogContent,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/app/_components/ui/dialog';
// import { Label } from '@/app/_components/ui/label';
// // import { authClient } from '@/lib/auth-client';
// // import { useMutation } from '@tanstack/react-query';
// import { useState } from 'react';
// import { toast } from 'sonner';

// interface DeleteAccountDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }

// function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
//   const [isConfirmed, setIsConfirmed] = useState(false);
//   // const deleteAccountMutation = useMutation({
//   //   mutationFn: async () => {
//   //     await authClient.deleteUser();
//   //   },
//   //   onSuccess: () => {
//   //     toast.success('Verification email sent. Please check your inbox.');
//   //     onOpenChange(false);
//   //   },
//   //   onError: (error: Error) => {
//   //     toast.error(error.message || 'Failed to initiate account deletion');
//   //     onOpenChange(false);
//   //   },
//   //   onSettled: () => {
//   //     setIsConfirmed(false);
//   //   },
//   // });

//   const handleDeleteAccount = () => {
//     deleteAccountMutation.mutate();
//   };

//   const handleDialogClose = () => {
//     setIsConfirmed(false);
//     onOpenChange(false);
//   };

//   return (
//     <Dialog open={open} onOpenChange={handleDialogClose}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle className="mb-4 text-2xl font-semibold">
//             Are you sure?
//           </DialogTitle>
//         </DialogHeader>
//         <div>
//           <ul className="mb-4 list-outside list-disc space-y-2 pl-4 text-base text-gray-600 dark:text-gray-400">
//             <li>This action cannot be undone.</li>
//             <li>
//               If you have any active subscription, they will be cancelled
//               immediately.
//             </li>
//             <li>
//               If you have any active plan or credits, they will be cancelled
//               immediately.
//             </li>
//             <li>
//               All your organization memberships will be revoked and you will no
//               longer have access to any organization.
//             </li>
//             <li>
//               All of your data will be permanently removed from our systems.
//             </li>
//             <li>
//               You will receive an email with a verification link to confirm the
//               deletion.
//             </li>
//           </ul>
//         </div>
//         <div className="mb-4 flex items-center space-x-2">
//           <Checkbox
//             id="confirm-delete"
//             checked={isConfirmed}
//             onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
//           />
//           <Label
//             htmlFor="confirm-delete"
//             className="text-sm font-medium text-red-500"
//           >
//             I understand that this action is irreversible
//           </Label>
//         </div>
//         <DialogFooter>
//           <Button
//             variant="outline"
//             onClick={handleDialogClose}
//             disabled={deleteAccountMutation.isPending}
//           >
//             Cancel
//           </Button>
//           <Button
//             variant="destructive"
//             onClick={handleDeleteAccount}
//             disabled={!isConfirmed || deleteAccountMutation.isPending}
//           >
//             {deleteAccountMutation.isPending
//               ? 'Sending verification...'
//               : 'Send Deletion Email'}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// export default function DeleteAccount() {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);

//   const handleDialogChange = (open: boolean) => {
//     setIsDialogOpen(open);
//   };

//   return (
//     <>
//       <div className="space-y-6">
//         <div>
//           <h2 className="mb-1 text-2xl font-bold">Danger Zone</h2>
//           <p className="mb-6 text-sm font-medium text-muted-foreground">
//             Irreversible and destructive actions
//           </p>

//           <div className="rounded-lg border border-destructive/50 p-6">
//             <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
//               <div className="space-y-1">
//                 <h3 className="text-lg font-semibold">Delete Account</h3>
//                 <p className="text-sm text-muted-foreground">
//                   Permanently delete your account and all associated data
//                 </p>
//               </div>
//               <Button
//                 variant="destructive"
//                 onClick={() => setIsDialogOpen(true)}
//                 className="w-full sm:w-auto"
//               >
//                 Delete Account
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>
//       <DeleteAccountDialog
//         open={isDialogOpen}
//         onOpenChange={handleDialogChange}
//       />
//     </>
//   );
// }
