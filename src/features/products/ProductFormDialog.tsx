import { Image as ImageIcon, Plus, WarningCircle, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import type { Product } from '@/api/types'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldError, FieldHint, Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ofertasLinesToPayload, ofertasToLines } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCreateProduct, useUpdateProduct } from './hooks'

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

interface NewImage {
  file: File
  previewUrl: string
}

type FieldErrors = Record<string, string>

/** Miniatura en relieve con botón de quitar que aparece al pasar el mouse. */
function ImageTile({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="group relative size-[72px] overflow-hidden rounded-xl neu-raised-sm">
      <img src={src} alt="" className="size-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Quitar imagen"
      >
        <X size={18} weight="bold" />
      </button>
    </div>
  )
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const isEditing = product !== null
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(product?.id ?? '')
  const mutation = isEditing ? updateProduct : createProduct

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [ofertasText, setOfertasText] = useState('')
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [removedImages, setRemovedImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<NewImage[]>([])
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [nonFieldError, setNonFieldError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setNombre(product?.nombre ?? '')
    setDescripcion(product?.descripcion ?? '')
    setPrecio(product?.precio ?? '')
    setOfertasText(ofertasToLines(product?.ofertas))
    setExistingImages(product?.imagenes ?? [])
    setRemovedImages([])
    setNewImages([])
    setFieldErrors({})
    setNonFieldError(null)
  }, [open, product])

  useEffect(() => {
    return () => {
      for (const img of newImages) URL.revokeObjectURL(img.previewUrl)
    }
  }, [newImages])

  function handleFilesSelected(files: FileList | null) {
    if (!files) return
    const nextImages = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setNewImages((prev) => [...prev, ...nextImages])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeExistingImage(url: string) {
    setExistingImages((prev) => prev.filter((img) => img !== url))
    setRemovedImages((prev) => [...prev, url])
  }

  function removeNewImage(previewUrl: string) {
    setNewImages((prev) => {
      const target = prev.find((img) => img.previewUrl === previewUrl)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((img) => img.previewUrl !== previewUrl)
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    setNonFieldError(null)

    try {
      await mutation.mutateAsync({
        nombre,
        descripcion,
        precio,
        ofertasLines: ofertasLinesToPayload(ofertasText),
        newImages: newImages.map((img) => img.file),
        imagesToRemove: removedImages,
      })
      toast.success(isEditing ? 'Producto actualizado.' : 'Producto creado.')
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const next: FieldErrors = {}
        for (const fieldError of err.errors) {
          if (fieldError.field) next[fieldError.field] = fieldError.message
        }
        setFieldErrors(next)
        const nonField = err.nonFieldMessages[0] ?? (Object.keys(next).length === 0 ? err.message : null)
        setNonFieldError(nonField)
      } else {
        setNonFieldError('No pudimos guardar el producto. Intentá de nuevo.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualizá los datos del producto.' : 'Completá los datos para agregarlo al catálogo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {nonFieldError && (
            <Banner tone="danger">
              <WarningCircle size={16} />
              {nonFieldError}
            </Banner>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={255}
              required
              aria-invalid={!!fieldErrors.nombre}
            />
            <FieldError message={fieldErrors.nombre} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              rows={5}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-invalid={!!fieldErrors.descripcion}
            />
            <FieldError message={fieldErrors.descripcion} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio</Label>
            <Input
              id="precio"
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="79900"
              required
              aria-invalid={!!fieldErrors.precio}
            />
            <FieldError message={fieldErrors.precio} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ofertas">Ofertas</Label>
            <Textarea
              id="ofertas"
              rows={3}
              value={ofertasText}
              onChange={(e) => setOfertasText(e.target.value)}
              placeholder={'1=79900'}
              className="font-mono"
              aria-invalid={!!fieldErrors.ofertas}
            />
            <FieldHint>Una oferta por línea, formato cantidad=total.</FieldHint>
            <FieldError message={fieldErrors.ofertas} />
          </div>

          <div className="space-y-2">
            <Label>Imágenes</Label>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((url) => (
                <ImageTile key={url} src={url} onRemove={() => removeExistingImage(url)} />
              ))}
              {newImages.map((img) => (
                <ImageTile key={img.previewUrl} src={img.previewUrl} onRemove={() => removeNewImage(img.previewUrl)} />
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex size-[72px] flex-col items-center justify-center gap-0.5 rounded-xl bg-canvas text-ink-faint neu-inset',
                  'transition-[color,box-shadow] hover:text-accent active:neu-pressed',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
                )}
                aria-label="Agregar imágenes"
              >
                <Plus size={16} weight="bold" />
                <ImageIcon size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>
            <FieldError message={fieldErrors.imagenes} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4 text-accent-ink" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
