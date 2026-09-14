import { useState, useRef, useEffect } from 'react';
import { Edit2, Minimize2, Cloud, Shield } from 'lucide-react';
import { NetworkNode } from '../../../types';
import { IconButton } from '../../common/IconButton';
import { ConnectionOverflowMenu } from '../ConnectionOverflowMenu';

interface ConnectionCardHeaderProps {
  name: string;
  type: string;
  icon: React.ReactNode;
  isEditingName: boolean;
  nodeName: string;
  nameError: string | null;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNameSubmit: () => void;
  onNameKeyDown: (e: React.KeyboardEvent) => void;
  onEditNameClick: () => void;
  onMinimize: () => void;
  connection: any;
}

/**
 * Header component for the connection card
 * Displays the connection name, type, and actions
 */
export function ConnectionCardHeader({
  name,
  type,
  icon,
  isEditingName,
  nodeName,
  nameError,
  onNameChange,
  onNameSubmit,
  onNameKeyDown,
  onEditNameClick,
  onMinimize,
  connection
}: ConnectionCardHeaderProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-6 border-b border-fw-secondary">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center bg-fw-wash rounded-lg">
            {icon}
          </div>
          <div>
            {isEditingName ? (
              <div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nodeName}
                  onChange={onNameChange}
                  onBlur={onNameSubmit}
                  onKeyDown={onNameKeyDown}
                  className={`w-full px-2 py-1 text-figma-lg font-medium bg-fw-base border ${nameError ? 'border-fw-error' : 'border-fw-active'} rounded focus:outline-none focus:ring-2 focus:ring-fw-active`}
                  placeholder="Enter connection name"
                  onClick={(e) => e.stopPropagation()}
                />
                {nameError && (
                  <p className="text-figma-sm text-fw-error mt-1">{nameError}</p>
                )}
              </div>
            ) : (
              <div>
                <h3
                  className="text-figma-lg font-medium text-fw-heading cursor-text"
                  onClick={onEditNameClick}
                >
                  {name}
                </h3>
                {connection?.configuration?.isLmcc && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#0057b8', backgroundColor: 'rgba(0,87,184,0.16)' }}>
                      <Shield className="h-3 w-3" />
                      AWS Max
                    </span>
                    {connection.configuration.lmccPending ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#686e74', backgroundColor: 'rgba(69,75,82,0.08)' }}>
                        Awaiting Setup
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#2d7e24', backgroundColor: 'rgba(45,126,36,0.16)' }}>
                        {connection.configuration.lmccActivePaths}/{connection.configuration.lmccPaths} paths
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#454b52', backgroundColor: 'rgba(69,75,82,0.12)' }}>
                      {connection.configuration.lmccMetro}
                    </span>
                  </div>
                )}
                {connection?.origin?.source === 'aws-marketplace' && !connection?.configuration?.isLmcc && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-fw-accent border border-fw-active/30 rounded-[8px] text-[10px] font-medium text-fw-link">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
                        alt="AWS"
                        className="w-6 h-3 object-contain"
                      />
                      Interconnect – last mile
                    </span>
                    {connection?.status === 'Pending' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#686e74', backgroundColor: 'rgba(69,75,82,0.1)' }}>
                        Needs Configuration
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-figma-sm font-medium text-fw-body">
              {type}
              {connection?.cloudRouterName && <> | {connection.cloudRouterName}</>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon={<Minimize2 className="h-4 w-4" />}
            onClick={onMinimize}
            variant="ghost"
            size="sm"
            title="Minimize"
          />
          <ConnectionOverflowMenu connection={connection} />
        </div>
      </div>
    </div>
  );
}