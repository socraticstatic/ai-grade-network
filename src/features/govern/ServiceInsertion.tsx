import { AttIcon } from '../../components/icons/AttIcon';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';

interface InsertableService {
  id: string;
  label: string;
  kind: string;
  target: string;
  desc: string;
  inserted: boolean;
}

export function ServiceInsertion() {
  const services = useCloudControl(cc => cc.serviceCatalog()) as InsertableService[];
  const actions = useCloudControlActions();

  const handleInsert = (id: string) => {
    actions.insertService(id);
  };

  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
        <AttIcon name="hub" className="h-5 w-5 text-fw-body" />
        <span className="font-medium text-fw-heading">Service insertion</span>
        {/* Row 64 of the phase-0 metric audit: "0 / 5 inserted" was
            deployment vocabulary for a posture claim. Same fraction,
            product noun. */}
        <span className="text-figma-xs text-fw-bodyLight">
          {services.filter(s => s.inserted).length} of {services.length} inspection services in the path
        </span>
      </div>

      <ul className="divide-y divide-fw-secondary">
        {services.map(svc => (
          <li key={svc.id} className="flex items-start justify-between gap-4 px-5 py-3">
            <div>
              <div className="font-medium text-fw-heading text-figma-sm">
                {svc.label}
                <span className="ml-2 text-figma-xs text-fw-bodyLight font-normal">
                  {svc.kind}
                </span>
              </div>
              <div className="text-figma-xs text-fw-bodyLight mt-0.5">
                {svc.desc} · <span className="italic">{svc.target}</span>
              </div>
            </div>
            <div className="shrink-0">
              {svc.inserted ? (
                <span className="inline-flex items-center h-8 px-3 rounded-full text-figma-xs font-medium bg-fw-successLight text-fw-success">
                  Inserted
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleInsert(svc.id)}
                  className="inline-flex items-center h-8 px-3 rounded-full text-figma-xs font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors"
                >
                  Insert
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
