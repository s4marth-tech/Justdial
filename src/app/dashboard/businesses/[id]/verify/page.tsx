import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VerificationForm } from "@/components/verification-form";
import { VERIFICATION_QUESTIONS } from "@/lib/verification/questions";

type VerifyBusinessPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VerifyBusinessPage({ params }: VerifyBusinessPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ownerId: true,
      verificationStatus: true,
      verificationSubmissions: {
        where: { status: "PENDING" },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!business) {
    notFound();
  }
  if (business.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const pendingSubmission = business.verificationSubmissions[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Verify {business.name}</h1>
      <p className="mb-6 text-muted-foreground">
        Answer a few questions about your professional background. An admin reviews every
        submission before it affects your listing.
      </p>

      {business.verificationStatus === "VERIFIED" ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">This business is already verified.</p>
        </div>
      ) : pendingSubmission ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">Your verification is under review.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted{" "}
            {new Date(pendingSubmission.createdAt).toLocaleDateString("en-IN", {
              dateStyle: "medium",
            })}
            . We&apos;ll let you know once an admin has reviewed it.
          </p>
        </div>
      ) : (
        <VerificationForm businessId={business.id} questions={VERIFICATION_QUESTIONS} />
      )}
    </div>
  );
}
