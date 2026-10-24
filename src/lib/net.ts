// Gives up after a while, so a slow or dropped connection shows an error
// instead of leaving a button stuck on "Please wait...".
export function withTimeout<T>(p: PromiseLike<T>, ms = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms)
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (err) => {
        clearTimeout(id)
        reject(err)
      },
    )
  })
}
