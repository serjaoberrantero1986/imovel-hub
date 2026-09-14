import React, { useState } from 'react';
import { Building, DollarSign, Mail, Lock } from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Input, 
  Select, 
  Textarea, 
  Checkbox, 
  Radio, 
  Switch 
} from '../../components/ui';

export const DesignSystemFormsSection: React.FC = () => {
  const [inputText, setInputText] = useState('Casa em Condomínio');
  const [switch1, setSwitch1] = useState(true);
  const [switch2, setSwitch2] = useState(false);
  const [checkbox1, setCheckbox1] = useState(true);
  const [radioVal, setRadioVal] = useState('residential');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <Card>
        <CardHeader>
          <CardTitle>Elementos de Formulário Imobiliário</CardTitle>
          <CardDescription>
            Inputs tipados, selects personalizados, caixas de texto com contagem de caracteres, checkboxes, rádios e switches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Título do Anúncio"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              helperText="Ex: Apartamento com 3 dormitórios no Campolim"
              leftIcon={<Building className="w-4 h-4" />}
              clearable
              onClear={() => setInputText('')}
              required
            />

            <Input
              label="Valor de Venda (R$)"
              placeholder="850.000"
              leftIcon={<DollarSign className="w-4 h-4" />}
              helperText="Formato monetário em Real brasileiro (BRL)"
            />

            <Input
              type="email"
              label="E-mail de Contato"
              placeholder="corretor@imobiliaria.com.br"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              type="password"
              label="Senha de Acesso"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              helperText="Mínimo de 8 caracteres alfanuméricos"
            />

            <Input
              label="Input com Erro de Validação"
              value="valor_invalido@"
              error="O código do imóvel inserido não foi localizado na base do CRECI."
            />

            <Select
              label="Finalidade do Imóvel"
              leftIcon={<Building className="w-4 h-4" />}
              options={[
                { value: 'sale', label: 'Venda (Comprar)' },
                { value: 'rent', label: 'Locação (Alugar)' },
                { value: 'launch', label: 'Lançamento na Planta' },
              ]}
            />
          </div>

          {/* Textarea */}
          <Textarea
            label="Descrição Completa do Imóvel"
            placeholder="Descreva os diferenciais, áreas comuns, acabamentos, insolação e proximidade a comércios..."
            showCount
            maxLength={500}
            rows={4}
            helperText="Boas descrições aumentam em até 40% a taxa de conversão em leads."
          />

          {/* Checkboxes, Radios, and Switches */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Checkboxes */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Checkboxes</h5>
              <Checkbox
                label="Piscina privativa"
                description="Área de lazer exclusiva da unidade"
                checked={checkbox1}
                onChange={e => setCheckbox1(e.target.checked)}
              />
              <Checkbox
                label="Aceita permuta"
                description="Estuda proposta por imóvel de menor valor"
              />
              <Checkbox
                label="Opção Desabilitada"
                disabled
              />
            </div>

            {/* Radios */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Radio Groups</h5>
              <Radio
                name="prop_category"
                label="Residencial"
                description="Casas, apartamentos e sobrados"
                checked={radioVal === 'residential'}
                onChange={() => setRadioVal('residential')}
              />
              <Radio
                name="prop_category"
                label="Comercial / Corporativo"
                description="Salas, lajes e galpões"
                checked={radioVal === 'commercial'}
                onChange={() => setRadioVal('commercial')}
              />
              <Radio
                name="prop_category"
                label="Terreno / Lote"
                description="Lotes em condomínio ou rua pública"
                checked={radioVal === 'land'}
                onChange={() => setRadioVal('land')}
              />
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Switches</h5>
              <Switch
                label="Anúncio Ativo e Publicado"
                description="Visível para todos os compradores no portal"
                checked={switch1}
                onChange={setSwitch1}
              />
              <Switch
                label="Destaque Super Premium"
                description="Aparece no topo das buscas regionais"
                checked={switch2}
                onChange={setSwitch2}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
