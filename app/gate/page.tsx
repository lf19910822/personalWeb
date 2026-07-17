import GateForm from "@/components/GateForm";

export const dynamic = "force-dynamic";

export default function GatePage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const from = searchParams.from || "/";
  return <GateForm from={from} />;
}
