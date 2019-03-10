const withTag = tag => {
  return content => `<${tag}>${content}</${tag}>`
}

export default withTag
