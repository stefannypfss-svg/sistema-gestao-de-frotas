import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Ação à direita (geralmente um botão primário). */
  action?: React.ReactNode;
}

/** Cabeçalho padrão de cada view: título, descrição e ação opcional. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
}) => (
  <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div>
      <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">{title}</h2>
      {description && <p className="text-[14px] text-gray-500 mt-1">{description}</p>}
    </div>
    {action}
  </header>
);
