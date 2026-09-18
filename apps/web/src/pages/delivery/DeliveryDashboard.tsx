import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptAssignment,
  completeAssignment,
  deliveryAssignments,
  pickupAssignment,
} from '@/api/endpoints/store';

export function DeliveryDashboardPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['delivery'], queryFn: deliveryAssignments });
  const action = useMutation({
    mutationFn: ({ kind, id }: { kind: string; id: string }) =>
      kind === 'accept'
        ? acceptAssignment(id)
        : kind === 'pickup'
          ? pickupAssignment(id)
          : completeAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery'] }),
  });

  if (q.isPending) return <p className="pt-8">Loading deliveries…</p>;

  return (
    <div className="pt-6">
      <h1 className="text-display">Delivery dashboard</h1>
      <div className="mt-5 space-y-3">
        {q.data?.map((assignment: any) => (
          <div key={assignment.id} className="rounded-card bg-surface p-5 shadow-card">
            <div className="flex justify-between">
              <b>{assignment.orderNumber}</b>
              <span className="text-caption">{assignment.status}</span>
            </div>
            <p className="mt-2 text-text-2">
              {assignment.customerName} · {assignment.city ?? '—'}
            </p>
            <div className="mt-4 flex gap-2">
              {assignment.status === 'OFFERED' && (
                <button
                  onClick={() => action.mutate({ kind: 'accept', id: assignment.id })}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  Accept
                </button>
              )}
              {assignment.status === 'ACCEPTED' && (
                <button
                  onClick={() => action.mutate({ kind: 'pickup', id: assignment.id })}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  Pick up
                </button>
              )}
              {assignment.status === 'PICKED_UP' && (
                <button
                  onClick={() => action.mutate({ kind: 'complete', id: assignment.id })}
                  className="rounded-full bg-grove-500 px-4 py-2 text-sm font-semibold"
                >
                  Delivered
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
