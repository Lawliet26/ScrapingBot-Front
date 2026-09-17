import { toast } from 'sonner'
import type { Product } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useDeleteProduct } from './hooks'

interface ProductDeleteDialogProps {
  product: Product | null
  onOpenChange: (open: boolean) => void
}

export function ProductDeleteDialog({ product, onOpenChange }: ProductDeleteDialogProps) {
  const deleteProduct = useDeleteProduct()

  async function handleConfirm() {
    if (!product) return
    try {
      await deleteProduct.mutateAsync(product.id)
      toast.success('Producto eliminado.')
      onOpenChange(false)
    } catch {
      toast.error('No pudimos eliminar el producto. Intentá de nuevo.')
    }
  }

  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Seguro que deseas eliminar {product?.nombre}?</DialogTitle>
          <DialogDescription>
            Los pedidos que referencian este producto quedarán sin producto asociado.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void handleConfirm()} disabled={deleteProduct.isPending}>
            {deleteProduct.isPending && <Spinner className="size-4 text-white" />}
            Sí, eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
