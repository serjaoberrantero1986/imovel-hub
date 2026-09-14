import React, { useState } from 'react';
import { Eye, Edit3 } from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  Pagination, 
  Badge, 
  Button 
} from '../../components/ui';
import { formatCurrency } from '../../lib/utils';

export const DesignSystemTablesSection: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <Card>
        <CardHeader>
          <CardTitle>Tabela de Dados & Paginação Completa</CardTitle>
          <CardDescription>
            Tabela limpa e modular com cabeçalhos ordenáveis, células personalizadas, badges de status e controle de paginação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código / Imóvel</TableHead>
                <TableHead>Tipo & Bairro</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visualizações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { code: '9840-APTO', title: 'Edifício Royal Park', type: 'Apartamento', neighborhood: 'Campolim', price: 950000, status: 'published', views: 432 },
                { code: '1029-CASA', title: 'Casa no Condomínio Ibiti', type: 'Casa em Condomínio', neighborhood: 'Ibiti do Paço', price: 1450000, status: 'published', views: 289 },
                { code: '3341-SALA', title: 'Sala Comercial Iguatemi Business', type: 'Comercial', neighborhood: 'Parque Campolim', price: 420000, status: 'pending', views: 115 },
                { code: '7721-COBE', title: 'Cobertura Duplex com Piscina', type: 'Cobertura', neighborhood: 'Jardim América', price: 2800000, status: 'draft', views: 45 },
              ].map(row => (
                <TableRow key={row.code}>
                  <TableCell>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block font-['Outfit']">
                        {row.title}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        #{row.code}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      {row.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {row.neighborhood}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {formatCurrency(row.price)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === 'published' ? 'sale' : row.status === 'pending' ? 'pending' : 'draft'}
                      size="sm"
                    >
                      {row.status === 'published' ? 'Publicado' : row.status === 'pending' ? 'Em Análise' : 'Rascunho'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {row.views} views
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="xs" variant="ghost" title="Visualizar">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="xs" variant="ghost" title="Editar">
                        <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={5}
            totalItems={48}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </CardContent>
      </Card>
    </div>
  );
};
