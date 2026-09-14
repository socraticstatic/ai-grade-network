import { useState } from 'react';
import { Plus, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../common/Button';

export function PaymentMethods() {
  const [paymentMethods] = useState([
    {
      id: '1',
      type: 'credit',
      last4: '4242',
      expiry: '12/24',
      isDefault: true,
      cardHolder: 'Sarah Patel'
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em]">Payment Methods</h3>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            window.addToast({
              type: 'info',
              title: 'Add Payment Method',
              message: 'Payment method creation coming soon',
              duration: 3000
            });
          }}
        >
          Add Payment Method
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className="bg-fw-base rounded-lg border border-fw-secondary p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-fw-wash rounded-lg">
                  <CreditCard className="h-6 w-6 text-fw-bodyLight" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-fw-heading">
                      &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {method.last4}
                    </span>
                    {method.isDefault && (
                      <span className="px-2 py-1 text-figma-sm font-medium text-fw-link bg-fw-accent rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-figma-base text-fw-bodyLight mt-1">
                    <span>{method.cardHolder}</span>
                    <span className="mx-2">&bull;</span>
                    <span>Expires {method.expiry}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Edit2}
                  onClick={() => {
                    window.addToast({
                      type: 'info',
                      title: 'Edit Payment Method',
                      message: 'Payment method editing coming soon',
                      duration: 3000
                    });
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  onClick={() => {
                    window.addToast({
                      type: 'info',
                      title: 'Delete Payment Method',
                      message: 'Payment method deletion coming soon',
                      duration: 3000
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
