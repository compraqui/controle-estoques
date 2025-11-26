"use client";

import { useEffect, useState } from "react";
import { 
  ChefHat, Refrigerator, Package, Plus, Trash2, AlertCircle, 
  TrendingDown, Calendar, LogOut, QrCode, FileText, BarChart3,
  Crown, CreditCard, Zap, Download, TrendingUp, ShoppingCart,
  Clock, DollarSign, CheckCircle2, XCircle, Barcode, Bell,
  Users, Send, Settings, Eye, Target, TrendingUpIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Html5Qrcode } from "html5-qrcode";
import Quagga from "quagga";

interface Item {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  local: "geladeira" | "armario";
  categoria: string;
  validade?: string;
  estoque_minimo: number;
  preco_unitario?: number;
  created_at: string;
  codigo_barras?: string;
}

interface MovimentacaoEstoque {
  id: string;
  item_id: string;
  item_nome: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  justificativa: string;
  data: string;
  usuario: string;
}

interface UserData {
  email: string;
  password: string;
  nome: string;
  plano: "free" | "premium";
  limite_itens: number;
  notificacoes_push: boolean;
  alerta_estoque_baixo: number;
}

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "info" | "alerta" | "oferta" | "sistema";
  data: string;
  lida: boolean;
  usuario?: string;
}

interface ProdutoConsumido {
  nome: string;
  quantidade_total: number;
  vezes_consumido: number;
  valor_total: number;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [userPlan, setUserPlan] = useState<"free" | "premium">("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [filtroLocal, setFiltroLocal] = useState<"todos" | "geladeira" | "armario">("todos");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Auth states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  
  // Form states
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [local, setLocal] = useState<"geladeira" | "armario">("geladeira");
  const [categoria, setCategoria] = useState("");
  const [validade, setValidade] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("1");
  const [precoUnitario, setPrecoUnitario] = useState("");

  // QR Code states
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Barcode states
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);

  // Baixa de estoque states
  const [showBaixaDialog, setShowBaixaDialog] = useState(false);
  const [itemBaixa, setItemBaixa] = useState<Item | null>(null);
  const [quantidadeBaixa, setQuantidadeBaixa] = useState("");
  const [justificativaBaixa, setJustificativaBaixa] = useState("");

  // Premium/Payment states
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "pix">("credit");

  // Admin states
  const [showAdminNotification, setShowAdminNotification] = useState(false);
  const [notifTitulo, setNotifTitulo] = useState("");
  const [notifMensagem, setNotifMensagem] = useState("");
  const [notifTipo, setNotifTipo] = useState<"info" | "alerta" | "oferta" | "sistema">("info");
  const [notifUsuario, setNotifUsuario] = useState("todos");

  // Configurações
  const [alertaEstoqueBaixo, setAlertaEstoqueBaixo] = useState(3);
  const [notificacoesPush, setNotificacoesPush] = useState(true);

  const LIMITE_FREE = 20;
  const PRECO_PREMIUM = 29.90;

  useEffect(() => {
    const loggedUser = localStorage.getItem("controlaqui_user");
    if (loggedUser) {
      setCurrentUser(loggedUser);
      setIsLoggedIn(true);
      
      // Verificar se é admin
      if (loggedUser === "Danilixz@admin.com") {
        setIsAdmin(true);
      }
      
      carregarDados(loggedUser);
      verificarAlertasEstoque(loggedUser);
    }
    setLoading(false);
  }, []);

  const carregarDados = (userEmail: string) => {
    // Carregar items
    const itemsKey = `controlaqui_items_${userEmail}`;
    const savedItems = localStorage.getItem(itemsKey);
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    }

    // Carregar movimentações
    const movKey = `controlaqui_movimentacoes_${userEmail}`;
    const savedMov = localStorage.getItem(movKey);
    if (savedMov) {
      setMovimentacoes(JSON.parse(savedMov));
    }

    // Carregar notificações
    const notifKey = `controlaqui_notificacoes_${userEmail}`;
    const savedNotif = localStorage.getItem(notifKey);
    if (savedNotif) {
      setNotificacoes(JSON.parse(savedNotif));
    }

    // Carregar plano do usuário
    const usersKey = "controlaqui_users";
    const users: UserData[] = JSON.parse(localStorage.getItem(usersKey) || "[]");
    const user = users.find(u => u.email === userEmail);
    if (user) {
      setUserPlan(user.plano || "free");
      setAlertaEstoqueBaixo(user.alerta_estoque_baixo || 3);
      setNotificacoesPush(user.notificacoes_push !== false);
    }
  };

  const salvarItems = (userEmail: string, newItems: Item[]) => {
    const itemsKey = `controlaqui_items_${userEmail}`;
    localStorage.setItem(itemsKey, JSON.stringify(newItems));
    setItems(newItems);
  };

  const salvarMovimentacoes = (userEmail: string, newMov: MovimentacaoEstoque[]) => {
    const movKey = `controlaqui_movimentacoes_${userEmail}`;
    localStorage.setItem(movKey, JSON.stringify(newMov));
    setMovimentacoes(newMov);
  };

  const salvarNotificacoes = (userEmail: string, newNotif: Notificacao[]) => {
    const notifKey = `controlaqui_notificacoes_${userEmail}`;
    localStorage.setItem(notifKey, JSON.stringify(newNotif));
    setNotificacoes(newNotif);
  };

  const verificarAlertasEstoque = (userEmail: string) => {
    const itemsKey = `controlaqui_items_${userEmail}`;
    const savedItems = localStorage.getItem(itemsKey);
    if (!savedItems) return;

    const items: Item[] = JSON.parse(savedItems);
    const usersKey = "controlaqui_users";
    const users: UserData[] = JSON.parse(localStorage.getItem(usersKey) || "[]");
    const user = users.find(u => u.email === userEmail);
    
    const limiteAlerta = user?.alerta_estoque_baixo || 3;
    const itemsBaixos = items.filter(i => i.quantidade <= limiteAlerta);

    if (itemsBaixos.length > 0 && user?.notificacoes_push !== false) {
      const notif: Notificacao = {
        id: Date.now().toString(),
        titulo: "⚠️ Alerta de Estoque Baixo",
        mensagem: `${itemsBaixos.length} ${itemsBaixos.length === 1 ? 'item está' : 'itens estão'} com estoque baixo!`,
        tipo: "alerta",
        data: new Date().toISOString(),
        lida: false,
        usuario: userEmail
      };

      const notifKey = `controlaqui_notificacoes_${userEmail}`;
      const savedNotif = localStorage.getItem(notifKey);
      const notificacoes = savedNotif ? JSON.parse(savedNotif) : [];
      
      // Verificar se já existe alerta similar recente (últimas 24h)
      const alerteRecente = notificacoes.find((n: Notificacao) => 
        n.tipo === "alerta" && 
        n.titulo.includes("Estoque Baixo") &&
        (Date.now() - new Date(n.data).getTime()) < 24 * 60 * 60 * 1000
      );

      if (!alerteRecente) {
        notificacoes.unshift(notif);
        localStorage.setItem(notifKey, JSON.stringify(notificacoes));
      }
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }

    const usersKey = "controlaqui_users";
    const users: UserData[] = JSON.parse(localStorage.getItem(usersKey) || "[]");

    // Login admin
    if (email === "Danilixz" && password === "ControlAqui$26") {
      const adminEmail = "Danilixz@admin.com";
      localStorage.setItem("controlaqui_user", adminEmail);
      setCurrentUser(adminEmail);
      setIsLoggedIn(true);
      setIsAdmin(true);
      setUserPlan("premium");
      toast.success("Bem-vindo, Administrador! 👑");
      carregarDados(adminEmail);
      return;
    }

    if (isSignUp) {
      const userExists = users.find(u => u.email === email);
      if (userExists) {
        toast.error("Email já cadastrado");
        return;
      }

      const newUser: UserData = {
        email,
        password,
        nome: nomeUsuario || email.split("@")[0],
        plano: "free",
        limite_itens: LIMITE_FREE,
        notificacoes_push: true,
        alerta_estoque_baixo: 3
      };

      users.push(newUser);
      localStorage.setItem(usersKey, JSON.stringify(users));
      localStorage.setItem("controlaqui_user", email);
      
      setCurrentUser(email);
      setIsLoggedIn(true);
      setUserPlan("free");
      toast.success("Conta criada! 🎉 Plano FREE ativo (até 20 itens)");
      carregarDados(email);
    } else {
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        toast.error("Email ou senha incorretos");
        return;
      }

      localStorage.setItem("controlaqui_user", email);
      setCurrentUser(email);
      setIsLoggedIn(true);
      setUserPlan(user.plano || "free");
      toast.success(`Bem-vindo de volta! 👋`);
      carregarDados(email);
    }

    setEmail("");
    setPassword("");
    setNomeUsuario("");
  };

  const handleLogout = () => {
    localStorage.removeItem("controlaqui_user");
    setIsLoggedIn(false);
    setCurrentUser("");
    setIsAdmin(false);
    setItems([]);
    setMovimentacoes([]);
    setNotificacoes([]);
    toast.success("Até logo! 👋");
  };

  const verificarLimite = (): boolean => {
    if (userPlan === "premium") return true;
    if (items.length >= LIMITE_FREE) {
      toast.error("Limite de 20 itens atingido! Faça upgrade para Premium 👑");
      setShowUpgradeDialog(true);
      return false;
    }
    return true;
  };

  const buscarProdutoGS1 = async (codigoBarras: string): Promise<any> => {
    // Simulação de busca na API GS1
    // Em produção, você faria uma requisição real para a API GS1
    
    // Base de dados simulada de produtos comuns
    const produtosSimulados: { [key: string]: any } = {
      "7891000100103": { nome: "Leite Integral 1L", categoria: "Laticínios", unidade: "un" },
      "7896036094501": { nome: "Arroz Branco 5kg", categoria: "Grãos", unidade: "5kg" },
      "7891000053508": { nome: "Achocolatado em Pó 400g", categoria: "Bebidas", unidade: "400g" },
      "7891000244807": { nome: "Biscoito Recheado 140g", categoria: "Biscoitos", unidade: "140g" },
      "7896036094600": { nome: "Feijão Preto 1kg", categoria: "Grãos", unidade: "1kg" },
      "7891000100004": { nome: "Café Solúvel 100g", categoria: "Bebidas", unidade: "100g" },
      "7891000315705": { nome: "Chocolate ao Leite 90g", categoria: "Doces", unidade: "90g" },
    };

    return new Promise((resolve) => {
      setTimeout(() => {
        const produto = produtosSimulados[codigoBarras];
        if (produto) {
          resolve({ ...produto, codigo_barras: codigoBarras });
        } else {
          resolve(null);
        }
      }, 500);
    });
  };

  const iniciarScanBarcode = async () => {
    setShowBarcodeScanner(true);
    setIsScanningBarcode(true);

    try {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: document.querySelector('#barcode-reader'),
          constraints: {
            facingMode: "environment"
          },
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader"]
        }
      }, (err) => {
        if (err) {
          toast.error("Erro ao acessar câmera");
          setShowBarcodeScanner(false);
          setIsScanningBarcode(false);
          return;
        }
        Quagga.start();
      });

      Quagga.onDetected(async (result) => {
        if (result.codeResult.code) {
          Quagga.stop();
          setIsScanningBarcode(false);
          await processarCodigoBarras(result.codeResult.code);
        }
      });
    } catch (err) {
      toast.error("Erro ao iniciar scanner");
      setShowBarcodeScanner(false);
      setIsScanningBarcode(false);
    }
  };

  const processarCodigoBarras = async (codigo: string) => {
    toast.info("Buscando produto na base GS1... 🔍");
    
    const produto = await buscarProdutoGS1(codigo);
    
    if (produto) {
      setNome(produto.nome);
      setCategoria(produto.categoria);
      setUnidade(produto.unidade);
      toast.success(`Produto encontrado: ${produto.nome}! ✅`);
      setShowBarcodeScanner(false);
    } else {
      toast.error("Produto não encontrado na base GS1. Adicione manualmente.");
      setShowBarcodeScanner(false);
    }
  };

  const fecharScanBarcode = () => {
    if (isScanningBarcode) {
      Quagga.stop();
    }
    setShowBarcodeScanner(false);
    setIsScanningBarcode(false);
  };

  const adicionarItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificarLimite()) return;

    if (!nome || !quantidade) {
      toast.error("Preencha nome e quantidade");
      return;
    }

    const newItem: Item = {
      id: Date.now().toString(),
      nome,
      quantidade: parseFloat(quantidade),
      unidade,
      local,
      categoria: categoria || "Outros",
      validade: validade || undefined,
      estoque_minimo: parseFloat(estoqueMinimo),
      preco_unitario: precoUnitario ? parseFloat(precoUnitario) : undefined,
      created_at: new Date().toISOString(),
    };

    const newItems = [newItem, ...items];
    salvarItems(currentUser, newItems);

    registrarMovimentacao(newItem.id, newItem.nome, "entrada", newItem.quantidade, "Adição manual de item");

    toast.success("Item adicionado com sucesso! ✅");
    limparFormulario();
    verificarAlertasEstoque(currentUser);
  };

  const limparFormulario = () => {
    setNome("");
    setQuantidade("");
    setCategoria("");
    setValidade("");
    setPrecoUnitario("");
  };

  const removerItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newItems = items.filter(item => item.id !== id);
    salvarItems(currentUser, newItems);
    
    registrarMovimentacao(id, item.nome, "saida", item.quantidade, "Remoção completa do item");
    toast.success("Item removido! 🗑️");
  };

  const abrirDialogBaixa = (item: Item) => {
    setItemBaixa(item);
    setQuantidadeBaixa("");
    setJustificativaBaixa("");
    setShowBaixaDialog(true);
  };

  const confirmarBaixa = () => {
    if (!itemBaixa || !quantidadeBaixa || !justificativaBaixa) {
      toast.error("Preencha quantidade e justificativa");
      return;
    }

    const qtd = parseFloat(quantidadeBaixa);
    if (qtd <= 0 || qtd > itemBaixa.quantidade) {
      toast.error("Quantidade inválida");
      return;
    }

    const novaQuantidade = itemBaixa.quantidade - qtd;
    const newItems = items.map(item =>
      item.id === itemBaixa.id ? { ...item, quantidade: novaQuantidade } : item
    );
    salvarItems(currentUser, newItems);

    registrarMovimentacao(itemBaixa.id, itemBaixa.nome, "saida", qtd, justificativaBaixa);

    toast.success(`Baixa registrada: ${qtd} ${itemBaixa.unidade} de ${itemBaixa.nome}`);
    setShowBaixaDialog(false);
    setItemBaixa(null);
    verificarAlertasEstoque(currentUser);
  };

  const registrarMovimentacao = (itemId: string, itemNome: string, tipo: "entrada" | "saida", quantidade: number, justificativa: string) => {
    const novaMov: MovimentacaoEstoque = {
      id: Date.now().toString(),
      item_id: itemId,
      item_nome: itemNome,
      tipo,
      quantidade,
      justificativa,
      data: new Date().toISOString(),
      usuario: currentUser
    };

    const newMov = [novaMov, ...movimentacoes];
    salvarMovimentacoes(currentUser, newMov);
  };

  const atualizarQuantidade = (id: string, novaQuantidade: number) => {
    if (novaQuantidade < 0) return;

    const item = items.find(i => i.id === id);
    if (!item) return;

    const diferenca = novaQuantidade - item.quantidade;
    
    const newItems = items.map(item =>
      item.id === id ? { ...item, quantidade: novaQuantidade } : item
    );
    salvarItems(currentUser, newItems);

    if (diferenca !== 0) {
      const tipo = diferenca > 0 ? "entrada" : "saida";
      registrarMovimentacao(id, item.nome, tipo, Math.abs(diferenca), "Ajuste manual de quantidade");
    }

    verificarAlertasEstoque(currentUser);
  };

  const iniciarScanQR = async () => {
    setShowQrScanner(true);
    setIsScanning(true);

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          await html5QrCode.stop();
          setIsScanning(false);
          processarNFCe(decodedText);
        },
        (errorMessage) => {
          // Ignorar erros de scan contínuo
        }
      );
    } catch (err) {
      toast.error("Erro ao acessar câmera");
      setShowQrScanner(false);
      setIsScanning(false);
    }
  };

  const processarNFCe = async (qrData: string) => {
    try {
      toast.info("Processando NFC-e... 📄");

      setTimeout(() => {
        if (!verificarLimite()) {
          setShowQrScanner(false);
          return;
        }

        const itensSimulados = [
          { nome: "Leite Integral 1L", quantidade: 2, unidade: "un", categoria: "Laticínios", preco: 4.99 },
          { nome: "Pão Francês", quantidade: 10, unidade: "un", categoria: "Padaria", preco: 0.50 },
          { nome: "Arroz 5kg", quantidade: 1, unidade: "5kg", categoria: "Grãos", preco: 22.90 }
        ];

        let adicionados = 0;
        itensSimulados.forEach(item => {
          if (items.length + adicionados >= LIMITE_FREE && userPlan === "free") {
            return;
          }

          const newItem: Item = {
            id: Date.now().toString() + Math.random(),
            nome: item.nome,
            quantidade: item.quantidade,
            unidade: item.unidade,
            local: "armario",
            categoria: item.categoria,
            estoque_minimo: 1,
            preco_unitario: item.preco,
            created_at: new Date().toISOString(),
          };

          items.push(newItem);
          registrarMovimentacao(newItem.id, newItem.nome, "entrada", newItem.quantidade, "Importação via NFC-e");
          adicionados++;
        });

        salvarItems(currentUser, [...items]);
        toast.success(`${adicionados} itens importados da NFC-e! 🎉`);
        setShowQrScanner(false);
        verificarAlertasEstoque(currentUser);
      }, 2000);
    } catch (error) {
      toast.error("Erro ao processar NFC-e");
      setShowQrScanner(false);
    }
  };

  const fecharScanQR = async () => {
    if (isScanning) {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        await html5QrCode.stop();
      } catch (err) {
        // Ignorar erro ao fechar
      }
    }
    setShowQrScanner(false);
    setIsScanning(false);
  };

  const upgradeToPremium = () => {
    setShowUpgradeDialog(false);
    setShowPaymentDialog(true);
  };

  const processarPagamento = () => {
    toast.info("Processando pagamento via Kirvano... 💳");

    setTimeout(() => {
      const usersKey = "controlaqui_users";
      const users: UserData[] = JSON.parse(localStorage.getItem(usersKey) || "[]");
      const userIndex = users.findIndex(u => u.email === currentUser);
      
      if (userIndex !== -1) {
        users[userIndex].plano = "premium";
        localStorage.setItem(usersKey, JSON.stringify(users));
        setUserPlan("premium");
        toast.success("Parabéns! Você agora é PREMIUM! 👑✨");
        setShowPaymentDialog(false);

        // Enviar notificação de boas-vindas premium
        const notif: Notificacao = {
          id: Date.now().toString(),
          titulo: "🎉 Bem-vindo ao Premium!",
          mensagem: "Agora você tem acesso ilimitado a todos os recursos do ControlAqui!",
          tipo: "sistema",
          data: new Date().toISOString(),
          lida: false,
          usuario: currentUser
        };
        const newNotif = [notif, ...notificacoes];
        salvarNotificacoes(currentUser, newNotif);
      }
    }, 2000);
  };

  const exportarRelatorio = () => {
    const relatorio = {
      usuario: currentUser,
      data_geracao: new Date().toISOString(),
      total_itens: items.length,
      movimentacoes: movimentacoes,
      valor_total_estoque: items.reduce((acc, item) => 
        acc + (item.preco_unitario || 0) * item.quantidade, 0
      )
    };

    const blob = new Blob([JSON.stringify(relatorio, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-controlaqui-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success("Relatório exportado! 📊");
  };

  // Admin functions
  const enviarNotificacao = () => {
    if (!notifTitulo || !notifMensagem) {
      toast.error("Preencha título e mensagem");
      return;
    }

    const usersKey = "controlaqui_users";
    const users: UserData[] = JSON.parse(localStorage.getItem(usersKey) || "[]");

    if (notifUsuario === "todos") {
      users.forEach(user => {
        const notif: Notificacao = {
          id: Date.now().toString() + Math.random(),
          titulo: notifTitulo,
          mensagem: notifMensagem,
          tipo: notifTipo,
          data: new Date().toISOString(),
          lida: false,
          usuario: user.email
        };

        const notifKey = `controlaqui_notificacoes_${user.email}`;
        const savedNotif = localStorage.getItem(notifKey);
        const notificacoes = savedNotif ? JSON.parse(savedNotif) : [];
        notificacoes.unshift(notif);
        localStorage.setItem(notifKey, JSON.stringify(notificacoes));
      });
      toast.success(`Notificação enviada para ${users.length} usuários! 📢`);
    } else if (notifUsuario === "free") {
      const usersFree = users.filter(u => u.plano === "free");
      usersFree.forEach(user => {
        const notif: Notificacao = {
          id: Date.now().toString() + Math.random(),
          titulo: notifTitulo,
          mensagem: notifMensagem,
          tipo: notifTipo,
          data: new Date().toISOString(),
          lida: false,
          usuario: user.email
        };

        const notifKey = `controlaqui_notificacoes_${user.email}`;
        const savedNotif = localStorage.getItem(notifKey);
        const notificacoes = savedNotif ? JSON.parse(savedNotif) : [];
        notificacoes.unshift(notif);
        localStorage.setItem(notifKey, JSON.stringify(notificacoes));
      });
      toast.success(`Notificação enviada para ${usersFree.length} usuários FREE! 📢`);
    } else if (notifUsuario === "premium") {
      const usersPremium = users.filter(u => u.plano === "premium");
      usersPremium.forEach(user => {
        const notif: Notificacao = {
          id: Date.now().toString() + Math.random(),
          titulo: notifTitulo,
          mensagem: notifMensagem,
          tipo: notifTipo,
          data: new Date().toISOString(),
          lida: false,
          usuario: user.email
        };

        const notifKey = `controlaqui_notificacoes_${user.email}`;
        const savedNotif = localStorage.getItem(notifKey);
        const notificacoes = savedNotif ? JSON.parse(savedNotif) : [];
        notificacoes.unshift(notif);
        localStorage.setItem(notifKey, JSON.stringify(notificacoes));
      });
      toast.success(`Notificação enviada para ${usersPremium.length} usuários PREMIUM! 📢`);
    }

    setNotifTitulo("");
    setNotifMensagem("");
    setShowAdminNotification(false);
  };

  const obterProdutosMaisConsumidos = (): ProdutoConsumido[] => {
    const usersKey = "controlaqui_users";
    const users: UserData[] = JSON.parse(localStorage.getItem(usersKey) || "[]");
    
    const produtosMap = new Map<string, ProdutoConsumido>();

    users.forEach(user => {
      const movKey = `controlaqui_movimentacoes_${user.email}`;
      const savedMov = localStorage.getItem(movKey);
      if (savedMov) {
        const movimentacoes: MovimentacaoEstoque[] = JSON.parse(savedMov);
        
        movimentacoes
          .filter(m => m.tipo === "saida")
          .forEach(mov => {
            const existing = produtosMap.get(mov.item_nome);
            if (existing) {
              existing.quantidade_total += mov.quantidade;
              existing.vezes_consumido += 1;
            } else {
              produtosMap.set(mov.item_nome, {
                nome: mov.item_nome,
                quantidade_total: mov.quantidade,
                vezes_consumido: 1,
                valor_total: 0
              });
            }
          });
      }
    });

    return Array.from(produtosMap.values())
      .sort((a, b) => b.quantidade_total - a.quantidade_total)
      .slice(0, 10);
  };

  const obterEstatisticasUsuarios = () => {
    const usersKey = "controlaqui_users";
    const users: UserData[] = JSON.parse(localStorage.getItem(usersKey) || "[]");
    
    const totalUsuarios = users.length;
    const usuariosFree = users.filter(u => u.plano === "free").length;
    const usuariosPremium = users.filter(u => u.plano === "premium").length;
    const receitaMensal = usuariosPremium * PRECO_PREMIUM;

    return {
      totalUsuarios,
      usuariosFree,
      usuariosPremium,
      receitaMensal,
      taxaConversao: totalUsuarios > 0 ? ((usuariosPremium / totalUsuarios) * 100).toFixed(1) : "0"
    };
  };

  const salvarConfiguracoes = () => {
    const usersKey = "controlaqui_users";
    const users: UserData[] = JSON.parse(localStorage.getItem(usersKey) || "[]");
    const userIndex = users.findIndex(u => u.email === currentUser);
    
    if (userIndex !== -1) {
      users[userIndex].alerta_estoque_baixo = alertaEstoqueBaixo;
      users[userIndex].notificacoes_push = notificacoesPush;
      localStorage.setItem(usersKey, JSON.stringify(users));
      toast.success("Configurações salvas! ⚙️");
    }
  };

  const itemsFiltrados = items.filter((item) => {
    if (filtroLocal === "todos") return true;
    return item.local === filtroLocal;
  });

  const itemsGeladeira = items.filter((i) => i.local === "geladeira");
  const itemsArmario = items.filter((i) => i.local === "armario");
  const itemsBaixoEstoque = items.filter((i) => i.quantidade <= alertaEstoqueBaixo);
  const itemsVencendo = items.filter((i) => {
    if (!i.validade) return false;
    const dias = Math.ceil((new Date(i.validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 7 && dias >= 0;
  });

  const valorTotalEstoque = items.reduce((acc, item) => 
    acc + (item.preco_unitario || 0) * item.quantidade, 0
  );

  const movimentacoesRecentes = movimentacoes.slice(0, 10);
  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ControlAqui
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Controle inteligente de estoque com IA
            </p>
          </div>
          
          <Card className="p-8 bg-white shadow-2xl border-0">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isSignUp ? "Criar Conta" : "Entrar"}
              </h2>
              <p className="text-sm text-gray-600">
                {isSignUp ? "Cadastre-se gratuitamente" : "Acesse sua conta"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome (opcional)
                  </label>
                  <Input
                    type="text"
                    value={nomeUsuario}
                    onChange={(e) => setNomeUsuario(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email ou Usuário
                </label>
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full"
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 text-lg shadow-lg"
              >
                {isSignUp ? "Criar Conta Grátis" : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {isSignUp
                  ? "Já tem uma conta? Entre"
                  : "Não tem conta? Cadastre-se"}
              </button>
            </div>
          </Card>

          <div className="mt-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p>Plano FREE: até 20 itens</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Crown className="w-4 h-4 text-yellow-600" />
              <p>Premium: itens ilimitados + relatórios avançados</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Responsivo */}
      <header className="bg-white shadow-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                  ControlAqui
                </h1>
                <p className="text-xs text-gray-600 truncate">
                  {currentUser.split("@")[0]} • 
                  {isAdmin ? (
                    <span className="text-red-600 font-semibold ml-1">👑 ADMIN</span>
                  ) : userPlan === "premium" ? (
                    <span className="text-yellow-600 font-semibold ml-1">👑 PREMIUM</span>
                  ) : (
                    <span className="text-gray-500 ml-1">FREE ({items.length}/{LIMITE_FREE})</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {notificacoesNaoLidas > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("notificacoes")}
                  className="relative p-2"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notificacoesNaoLidas}
                  </span>
                </Button>
              )}
              {userPlan === "free" && !isAdmin && (
                <Button
                  onClick={() => setShowUpgradeDialog(true)}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white gap-1 text-xs sm:text-sm px-2 sm:px-3"
                  size="sm"
                >
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Upgrade</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-xs sm:text-sm gap-1 px-2 sm:px-3"
                size="sm"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-5 bg-white shadow-md gap-1 p-1">
            <TabsTrigger value="dashboard" className="gap-1 text-xs sm:text-sm px-1 sm:px-3">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
            </TabsTrigger>
            <TabsTrigger value="estoque" className="gap-1 text-xs sm:text-sm px-1 sm:px-3">
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Estoque</span>
              <span className="sm:hidden">Est</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-1 text-xs sm:text-sm px-1 sm:px-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Relatórios</span>
              <span className="sm:hidden">Rel</span>
            </TabsTrigger>
            <TabsTrigger value="importar" className="gap-1 text-xs sm:text-sm px-1 sm:px-3">
              <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Importar</span>
              <span className="sm:hidden">Imp</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="gap-1 text-xs sm:text-sm px-1 sm:px-3 col-span-4 sm:col-span-1">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <Refrigerator className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" />
                </div>
                <p className="text-xs sm:text-sm opacity-90 mb-1">Geladeira</p>
                <p className="text-3xl sm:text-4xl font-bold">{itemsGeladeira.length}</p>
              </Card>

              <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" />
                </div>
                <p className="text-xs sm:text-sm opacity-90 mb-1">Armário</p>
                <p className="text-3xl sm:text-4xl font-bold">{itemsArmario.length}</p>
              </Card>

              <Card className="p-4 sm:p-6 bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" />
                </div>
                <p className="text-xs sm:text-sm opacity-90 mb-1">Estoque Baixo</p>
                <p className="text-3xl sm:text-4xl font-bold">{itemsBaixoEstoque.length}</p>
              </Card>

              <Card className="p-4 sm:p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" />
                </div>
                <p className="text-xs sm:text-sm opacity-90 mb-1">Valor Total</p>
                <p className="text-2xl sm:text-3xl font-bold">R$ {valorTotalEstoque.toFixed(2)}</p>
              </Card>
            </div>

            {/* Alertas */}
            {(itemsBaixoEstoque.length > 0 || itemsVencendo.length > 0) && (
              <Card className="p-4 sm:p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="font-bold text-base sm:text-lg">⚠️ Alertas Importantes</h3>
                    {itemsBaixoEstoque.length > 0 && (
                      <p className="text-xs sm:text-sm">🔴 {itemsBaixoEstoque.length} {itemsBaixoEstoque.length === 1 ? 'item está' : 'itens estão'} com estoque baixo</p>
                    )}
                    {itemsVencendo.length > 0 && (
                      <p className="text-xs sm:text-sm">⏰ {itemsVencendo.length} {itemsVencendo.length === 1 ? 'item vence' : 'itens vencem'} em até 7 dias</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Movimentações Recentes */}
            <Card className="p-4 sm:p-6 bg-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  Movimentações Recentes
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarRelatorio}
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {movimentacoesRecentes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">Nenhuma movimentação ainda</p>
                ) : (
                  movimentacoesRecentes.map((mov) => (
                    <div key={mov.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-lg ${mov.tipo === "entrada" ? "bg-green-100" : "bg-red-100"}`}>
                        {mov.tipo === "entrada" ? (
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{mov.item_nome}</p>
                          <Badge variant={mov.tipo === "entrada" ? "default" : "destructive"} className="text-xs">
                            {mov.tipo === "entrada" ? "Entrada" : "Saída"}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 break-words">{mov.justificativa}</p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          <span>Qtd: {mov.quantidade}</span>
                          <span>•</span>
                          <span className="truncate">{new Date(mov.data).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* ESTOQUE */}
          <TabsContent value="estoque" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Formulário */}
              <Card className="p-4 sm:p-6 bg-white shadow-xl lg:col-span-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Adicionar Item
                </h2>
                
                {/* Botões de Scanner */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={iniciarScanBarcode}
                    className="w-full gap-2 text-xs sm:text-sm"
                  >
                    <Barcode className="w-4 h-4" />
                    Código Barras
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={iniciarScanQR}
                    className="w-full gap-2 text-xs sm:text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    QR NFC-e
                  </Button>
                </div>

                <form onSubmit={adicionarItem} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Item
                    </label>
                    <Input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Leite, Arroz..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantidade
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        value={quantidade}
                        onChange={(e) => setQuantidade(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unidade
                      </label>
                      <select
                        value={unidade}
                        onChange={(e) => setUnidade(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="un">Unidade</option>
                        <option value="PACOTE">Pacote</option>
                        <option value="FARDO">Fardo</option>
                        <option value="44g">44g</option>
                        <option value="50g">50g</option>
                        <option value="100g">100g</option>
                        <option value="500g">500g</option>
                        <option value="1kg">1 KG</option>
                        <option value="5kg">5 KG</option>
                        <option value="10kg">10 KG</option>
                        <option value="kg">KG</option>
                        <option value="g">Gramas</option>
                        <option value="L">Litros</option>
                        <option value="ml">ML</option>
                        <option value="cx">Caixa</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Local
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLocal("geladeira")}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          local === "geladeira"
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Refrigerator className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-blue-600" />
                        <p className="text-xs font-medium">Geladeira</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocal("armario")}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          local === "armario"
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-amber-600" />
                        <p className="text-xs font-medium">Armário</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <Input
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      placeholder="Ex: Laticínios, Grãos..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço Unitário (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={precoUnitario}
                      onChange={(e) => setPrecoUnitario(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Validade (opcional)
                    </label>
                    <Input
                      type="date"
                      value={validade}
                      onChange={(e) => setValidade(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estoque Mínimo
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={estoqueMinimo}
                      onChange={(e) => setEstoqueMinimo(e.target.value)}
                      placeholder="1"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </form>
              </Card>

              {/* Lista de Itens */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Button
                    variant={filtroLocal === "todos" ? "default" : "outline"}
                    onClick={() => setFiltroLocal("todos")}
                    size="sm"
                    className={`text-xs sm:text-sm ${filtroLocal === "todos" ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                  >
                    Todos ({items.length})
                  </Button>
                  <Button
                    variant={filtroLocal === "geladeira" ? "default" : "outline"}
                    onClick={() => setFiltroLocal("geladeira")}
                    size="sm"
                    className={`text-xs sm:text-sm ${filtroLocal === "geladeira" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  >
                    <Refrigerator className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Geladeira ({itemsGeladeira.length})
                  </Button>
                  <Button
                    variant={filtroLocal === "armario" ? "default" : "outline"}
                    onClick={() => setFiltroLocal("armario")}
                    size="sm"
                    className={`text-xs sm:text-sm ${filtroLocal === "armario" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                  >
                    <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Armário ({itemsArmario.length})
                  </Button>
                </div>

                {itemsFiltrados.length === 0 ? (
                  <Card className="p-8 sm:p-12 text-center bg-white shadow-xl">
                    <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium text-sm sm:text-base">Nenhum item encontrado</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-2">Adicione itens usando o formulário ao lado</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {itemsFiltrados.map((item) => {
                      const diasValidade = item.validade
                        ? Math.ceil((new Date(item.validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      const vencendo = diasValidade !== null && diasValidade <= 7 && diasValidade >= 0;
                      const vencido = diasValidade !== null && diasValidade < 0;
                      const baixoEstoque = item.quantidade <= alertaEstoqueBaixo;

                      return (
                        <Card key={item.id} className="p-3 sm:p-4 bg-white hover:shadow-lg transition-all shadow-md">
                          <div className="flex items-start justify-between gap-2 sm:gap-4">
                            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                                item.local === "geladeira" ? "bg-blue-100" : "bg-amber-100"
                              }`}>
                                {item.local === "geladeira" ? (
                                  <Refrigerator className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                ) : (
                                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{item.nome}</h3>
                                  <Badge variant="outline" className="text-xs">
                                    {item.categoria}
                                  </Badge>
                                  {baixoEstoque && (
                                    <Badge variant="destructive" className="text-xs">
                                      Estoque Baixo
                                    </Badge>
                                  )}
                                  {vencendo && (
                                    <Badge className="text-xs bg-orange-500">
                                      Vence em {diasValidade}d
                                    </Badge>
                                  )}
                                  {vencido && (
                                    <Badge variant="destructive" className="text-xs">
                                      Vencido
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="font-medium text-base sm:text-lg text-gray-900">
                                      {item.quantidade}
                                    </span>
                                    <span>{item.unidade}</span>
                                  </div>
                                  {item.preco_unitario && (
                                    <span className="text-xs text-green-600 font-semibold">
                                      R$ {(item.preco_unitario * item.quantidade).toFixed(2)}
                                    </span>
                                  )}
                                  {item.validade && (
                                    <span className="text-xs truncate">
                                      Val: {new Date(item.validade).toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                -
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                +
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => abrirDialogBaixa(item)}
                                title="Dar baixa com justificativa"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removerItem(item.id)}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* RELATÓRIOS */}
          <TabsContent value="relatorios" className="space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6 bg-white shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  Relatórios Inteligentes
                </h2>
                <Button
                  onClick={exportarRelatorio}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2 text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Exportar Completo</span>
                  <span className="sm:hidden">Exportar</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Total de Itens</p>
                  <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{items.length}</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Movimentações</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{movimentacoes.length}</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">R$ {valorTotalEstoque.toFixed(2)}</p>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Histórico Completo de Movimentações</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {movimentacoes.length === 0 ? (
                    <p className="text-center text-gray-500 py-12 text-sm">Nenhuma movimentação registrada ainda</p>
                  ) : (
                    movimentacoes.map((mov) => (
                      <div key={mov.id} className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className={`p-2 rounded-lg ${mov.tipo === "entrada" ? "bg-green-100" : "bg-red-100"}`}>
                          {mov.tipo === "entrada" ? (
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{mov.item_nome}</p>
                            <Badge variant={mov.tipo === "entrada" ? "default" : "destructive"} className="text-xs">
                              {mov.tipo === "entrada" ? "Entrada" : "Saída"}
                            </Badge>
                            <span className="text-xs sm:text-sm font-medium text-gray-700">
                              {mov.quantidade} un
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1 break-words">{mov.justificativa}</p>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-wrap">
                            <span className="truncate">{new Date(mov.data).toLocaleString("pt-BR")}</span>
                            <span>•</span>
                            <span className="truncate">{mov.usuario.split("@")[0]}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* IMPORTAR NFC-e */}
          <TabsContent value="importar" className="space-y-4 sm:space-y-6">
            <Card className="p-6 sm:p-8 bg-white shadow-xl text-center">
              <div className="max-w-2xl mx-auto">
                <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 flex items-center justify-center">
                  <QrCode className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                  Importar NFC-e via QR Code
                </h2>
                <p className="text-gray-600 mb-8 text-base sm:text-lg">
                  Escaneie o QR Code da sua nota fiscal e importe todos os itens automaticamente!
                </p>

                <div className="space-y-4">
                  <Button
                    onClick={iniciarScanQR}
                    className="w-full max-w-md mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-6 text-base sm:text-lg gap-3"
                    size="lg"
                  >
                    <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
                    Escanear QR Code da NFC-e
                  </Button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl sm:text-2xl font-bold text-blue-600">1</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Escaneie o QR Code</p>
                      <p className="text-xs text-gray-600 mt-1">Aponte a câmera para o código</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl sm:text-2xl font-bold text-purple-600">2</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Processamento</p>
                      <p className="text-xs text-gray-600 mt-1">Extraímos os dados da nota</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl sm:text-2xl font-bold text-green-600">3</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Pronto!</p>
                      <p className="text-xs text-gray-600 mt-1">Itens adicionados ao estoque</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* PAINEL ADMIN */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-4 sm:space-y-6">
              <Card className="p-4 sm:p-6 bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Painel Administrativo</h2>
                    <p className="text-xs sm:text-sm opacity-90">Gestão completa da plataforma</p>
                  </div>
                </div>
              </Card>

              {/* Estatísticas Gerais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {(() => {
                  const stats = obterEstatisticasUsuarios();
                  return (
                    <>
                      <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-80" />
                        <p className="text-xs sm:text-sm opacity-90 mb-1">Total Usuários</p>
                        <p className="text-3xl sm:text-4xl font-bold">{stats.totalUsuarios}</p>
                      </Card>

                      <Card className="p-4 sm:p-6 bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-xl">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-80" />
                        <p className="text-xs sm:text-sm opacity-90 mb-1">Usuários FREE</p>
                        <p className="text-3xl sm:text-4xl font-bold">{stats.usuariosFree}</p>
                      </Card>

                      <Card className="p-4 sm:p-6 bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-xl">
                        <Crown className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-80" />
                        <p className="text-xs sm:text-sm opacity-90 mb-1">Usuários PREMIUM</p>
                        <p className="text-3xl sm:text-4xl font-bold">{stats.usuariosPremium}</p>
                      </Card>

                      <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl">
                        <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-80" />
                        <p className="text-xs sm:text-sm opacity-90 mb-1">Receita Mensal</p>
                        <p className="text-2xl sm:text-3xl font-bold">R$ {stats.receitaMensal.toFixed(2)}</p>
                      </Card>
                    </>
                  );
                })()}
              </div>

              {/* Produtos Mais Consumidos */}
              <Card className="p-4 sm:p-6 bg-white shadow-xl">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  Top 10 Produtos Mais Consumidos
                </h3>
                <div className="space-y-3">
                  {obterProdutosMaisConsumidos().map((produto, index) => (
                    <div key={produto.nome} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-indigo-600 text-sm sm:text-base">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{produto.nome}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {produto.quantidade_total} unidades • {produto.vezes_consumido} vezes
                        </p>
                      </div>
                      <TrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    </div>
                  ))}
                  {obterProdutosMaisConsumidos().length === 0 && (
                    <p className="text-center text-gray-500 py-8 text-sm">Nenhum dado de consumo ainda</p>
                  )}
                </div>
              </Card>

              {/* Enviar Notificações */}
              <Card className="p-4 sm:p-6 bg-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Send className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                    Enviar Notificação Push
                  </h3>
                  <Button
                    onClick={() => setShowAdminNotification(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 gap-2 text-xs sm:text-sm"
                  >
                    <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                    Nova Notificação
                  </Button>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  Envie notificações personalizadas para usuários FREE, PREMIUM ou todos os usuários da plataforma.
                </p>
              </Card>

              {/* Configurações de Preço */}
              <Card className="p-4 sm:p-6 bg-white shadow-xl">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  Configuração de Preços
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">Plano FREE</p>
                        <p className="text-xs sm:text-sm text-gray-600">Até 20 itens</p>
                      </div>
                      <Badge className="bg-green-600 text-sm sm:text-base">R$ 0,00/mês</Badge>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                          Plano PREMIUM
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">Itens ilimitados + recursos avançados</p>
                      </div>
                      <Badge className="bg-yellow-600 text-sm sm:text-base">R$ {PRECO_PREMIUM.toFixed(2)}/mês</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          )}

          {/* NOTIFICAÇÕES */}
          <TabsContent value="notificacoes" className="space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6 bg-white shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  Notificações
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newNotif = notificacoes.map(n => ({ ...n, lida: true }));
                    salvarNotificacoes(currentUser, newNotif);
                    toast.success("Todas marcadas como lidas");
                  }}
                  className="text-xs sm:text-sm"
                >
                  Marcar todas como lidas
                </Button>
              </div>

              <div className="space-y-3">
                {notificacoes.length === 0 ? (
                  <p className="text-center text-gray-500 py-12 text-sm">Nenhuma notificação ainda</p>
                ) : (
                  notificacoes.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        notif.lida
                          ? "bg-gray-50 border-gray-200"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          notif.tipo === "alerta" ? "bg-red-100" :
                          notif.tipo === "oferta" ? "bg-yellow-100" :
                          notif.tipo === "sistema" ? "bg-blue-100" :
                          "bg-gray-100"
                        }`}>
                          <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            notif.tipo === "alerta" ? "text-red-600" :
                            notif.tipo === "oferta" ? "text-yellow-600" :
                            notif.tipo === "sistema" ? "text-blue-600" :
                            "text-gray-600"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{notif.titulo}</p>
                            <Badge variant="outline" className="text-xs">
                              {notif.tipo}
                            </Badge>
                            {!notif.lida && (
                              <Badge className="bg-blue-600 text-xs">Nova</Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{notif.mensagem}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(notif.data).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Configurações de Notificações */}
            <Card className="p-4 sm:p-6 bg-white shadow-xl">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                Configurações de Alertas
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alerta de estoque baixo quando quantidade for menor ou igual a:
                  </label>
                  <Input
                    type="number"
                    value={alertaEstoqueBaixo}
                    onChange={(e) => setAlertaEstoqueBaixo(parseInt(e.target.value))}
                    min="1"
                    className="max-w-xs"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="notif-push"
                    checked={notificacoesPush}
                    onChange={(e) => setNotificacoesPush(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="notif-push" className="text-sm text-gray-700">
                    Receber notificações push de alertas de estoque
                  </label>
                </div>
                <Button
                  onClick={salvarConfiguracoes}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Salvar Configurações
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog QR Scanner */}
      <Dialog open={showQrScanner} onOpenChange={fecharScanQR}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escanear QR Code da NFC-e</DialogTitle>
            <DialogDescription>
              Posicione o QR Code da nota fiscal dentro da área de leitura
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
            <Button
              variant="outline"
              onClick={fecharScanQR}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Barcode Scanner */}
      <Dialog open={showBarcodeScanner} onOpenChange={fecharScanBarcode}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escanear Código de Barras</DialogTitle>
            <DialogDescription>
              Posicione o código de barras do produto dentro da área de leitura
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div id="barcode-reader" className="w-full h-64 rounded-lg overflow-hidden bg-black"></div>
            <Button
              variant="outline"
              onClick={fecharScanBarcode}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Baixa de Estoque */}
      <Dialog open={showBaixaDialog} onOpenChange={setShowBaixaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar Baixa no Estoque</DialogTitle>
            <DialogDescription>
              Registre a saída do item com justificativa para rastreabilidade
            </DialogDescription>
          </DialogHeader>
          {itemBaixa && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900">{itemBaixa.nome}</p>
                <p className="text-sm text-gray-600">
                  Estoque atual: {itemBaixa.quantidade} {itemBaixa.unidade}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade a dar baixa
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={quantidadeBaixa}
                  onChange={(e) => setQuantidadeBaixa(e.target.value)}
                  placeholder="0"
                  max={itemBaixa.quantidade}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Justificativa *
                </label>
                <Textarea
                  value={justificativaBaixa}
                  onChange={(e) => setJustificativaBaixa(e.target.value)}
                  placeholder="Ex: Consumo, Vencimento, Perda, Doação..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBaixaDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarBaixa}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Confirmar Baixa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Upgrade Premium */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Crown className="w-6 h-6 text-yellow-500" />
              Upgrade para Premium
            </DialogTitle>
            <DialogDescription>
              Desbloqueie todo o potencial do ControlAqui
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Itens Ilimitados</p>
                  <p className="text-sm text-gray-600">Adicione quantos itens quiser</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Relatórios Avançados</p>
                  <p className="text-sm text-gray-600">Análises detalhadas e exportação</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Importação NFC-e Ilimitada</p>
                  <p className="text-sm text-gray-600">Escaneie quantas notas quiser</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Suporte Prioritário</p>
                  <p className="text-sm text-gray-600">Atendimento VIP</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
              <p className="text-center text-3xl font-bold text-gray-900 mb-1">
                R$ {PRECO_PREMIUM.toFixed(2)}<span className="text-lg font-normal text-gray-600">/mês</span>
              </p>
              <p className="text-center text-sm text-gray-600">Cancele quando quiser</p>
            </div>

            <Button
              onClick={upgradeToPremium}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-6 text-lg gap-2"
            >
              <Crown className="w-5 h-5" />
              Assinar Premium Agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Pagamento */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Pagamento via Kirvano
            </DialogTitle>
            <DialogDescription>
              Escolha sua forma de pagamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-center text-2xl font-bold text-gray-900">
                R$ {PRECO_PREMIUM.toFixed(2)}<span className="text-sm font-normal text-gray-600">/mês</span>
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setPaymentMethod("credit")}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "credit"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Cartão de Crédito</p>
                    <p className="text-sm text-gray-600">Aprovação imediata</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod("pix")}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "pix"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-green-600" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">PIX</p>
                    <p className="text-sm text-gray-600">Pagamento instantâneo</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={processarPagamento}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Confirmar Pagamento
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Pagamento processado com segurança pela Kirvano
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Admin - Enviar Notificação */}
      {isAdmin && (
        <Dialog open={showAdminNotification} onOpenChange={setShowAdminNotification}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                Enviar Notificação Push
              </DialogTitle>
              <DialogDescription>
                Envie notificações personalizadas para os usuários
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destinatários
                </label>
                <select
                  value={notifUsuario}
                  onChange={(e) => setNotifUsuario(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="todos">Todos os usuários</option>
                  <option value="free">Apenas usuários FREE</option>
                  <option value="premium">Apenas usuários PREMIUM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Notificação
                </label>
                <select
                  value={notifTipo}
                  onChange={(e) => setNotifTipo(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="info">Informação</option>
                  <option value="alerta">Alerta</option>
                  <option value="oferta">Oferta</option>
                  <option value="sistema">Sistema</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <Input
                  value={notifTitulo}
                  onChange={(e) => setNotifTitulo(e.target.value)}
                  placeholder="Ex: Nova funcionalidade disponível!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem
                </label>
                <Textarea
                  value={notifMensagem}
                  onChange={(e) => setNotifMensagem(e.target.value)}
                  placeholder="Digite a mensagem da notificação..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAdminNotification(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={enviarNotificacao}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
